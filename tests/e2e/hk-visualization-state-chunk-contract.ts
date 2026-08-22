import { createHash } from "node:crypto";

export const HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION =
  "hk-viz-state-chunk-v3" as const;
export const HK_VISUALIZATION_STATE_CHUNK_MAXIMUM_SIZE = 32 as const;
export const HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS = 120_000 as const;
export const HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS = 120_000 as const;
/**
 * Scroll-position audits are intentionally bounded. One state first runs its
 * math/discovery work, then the six visual/interaction audits at all-start and
 * at the middle and end of every visible educational horizontal scroller.
 * The maximum reserve is used before execution; receipts later report the
 * exact observed-count-derived audited time.
 */
export const HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_CONTAINER_COUNT =
  4 as const;
export const HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_OBSERVATION_COUNT =
  1 + 2 * HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_CONTAINER_COUNT;
export const HK_VISUALIZATION_PROVISIONAL_STATE_MATH_AND_SCROLL_DISCOVERY_MS =
  2_000 as const;
export const HK_VISUALIZATION_PROVISIONAL_SCROLL_OBSERVATION_AND_SIX_AUDITS_MS =
  6_000 as const;
export const HK_VISUALIZATION_PROVISIONAL_CHUNK_BOUNDARY_MS = 10_000 as const;
export const HK_VISUALIZATION_PROVISIONAL_REHYDRATION_ACTION_MS =
  4_000 as const;
export const HK_VISUALIZATION_PROVISIONAL_NON_RANGE_ACTION_MS = 10_000 as const;
export const HK_VISUALIZATION_PROVISIONAL_FINAL_RESET_MS = 10_000 as const;
export const HK_VISUALIZATION_PROVISIONAL_MARGIN_MS = 60_000 as const;

export const HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS = Object.freeze([
  "math",
  "layout",
  "collision",
  "contrast",
  "controlVisibility",
  "target44",
  "hitTarget",
] as const);

export const HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS = Object.freeze([
  "layout",
  "collision",
  "contrast",
  "controlVisibility",
  "target44",
  "hitTarget",
] as const);

export const HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS =
  HK_VISUALIZATION_PROVISIONAL_STATE_MATH_AND_SCROLL_DISCOVERY_MS +
  HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_OBSERVATION_COUNT *
    HK_VISUALIZATION_PROVISIONAL_SCROLL_OBSERVATION_AND_SIX_AUDITS_MS;

export type HkVisualizationMandatoryStateAuditId =
  (typeof HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS)[number];

export type HkVisualizationScrollPositionAuditId =
  (typeof HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS)[number];

export type HkVisualizationReceiptStatus = "passed" | "failed" | "skipped";

export type HkVisualizationModeContextEntry = Readonly<{
  activeModeId: string;
  dependsOnGroupId: string | null;
  groupId: string;
  replayActionId: string;
  replaySelector: string;
}>;

export type HkVisualizationProjectedAbsence = Readonly<{
  controllerActionId: string;
  fixedNodeSelector: string;
  fixedValue: number | string;
  projection: "clamp-and-visibility";
  reason: string;
}>;

export type HkVisualizationRehydrationAction = Readonly<{
  actionId: string;
  actionKind: "activate-mode" | "set-range-value";
  controlId: string | null;
  expectedValue: number | string;
  projectedAbsence: HkVisualizationProjectedAbsence | null;
  requestedValue: number | string;
  selector: string;
  targetPolicy: "projected-fixed-node" | "required-interactive";
}>;

export type HkVisualizationNonRangeActionKind =
  | "click"
  | "focus"
  | "keyboard-activate"
  | "keyboard-adjust"
  | "set-value";

export type HkVisualizationNonRangeOutcomePolicy =
  "exact-no-change" | "focus-activate" | "meaningful-change" | "state-change";

export type HkVisualizationNonRangeActionInput = Readonly<{
  actionId: string;
  actionKind: HkVisualizationNonRangeActionKind;
  expectedOutcome: HkVisualizationNonRangeOutcomePolicy;
  requestedValue: number | string | null;
  selector: string;
  targetId: string;
}>;

export type HkVisualizationCanonicalNonRangeAction = Readonly<
  HkVisualizationNonRangeActionInput & {
    index: number;
    inputHash: string;
  }
>;

export type HkVisualizationPreflightCellStateInput = Readonly<{
  actionSignature: string;
  descriptorHash: string;
  domainId: string | null;
  expectedSignature: string;
  id: string;
  modeContext: readonly HkVisualizationModeContextEntry[];
  modeId: string;
  orderedControlIds: readonly string[];
  reasons: readonly string[];
  rehydrationActions: readonly HkVisualizationRehydrationAction[];
  requestedSignature: string;
  startingSignature: string;
}>;

export type HkVisualizationStateCellPlanInput = Readonly<{
  cellId: string;
  marginMs: number;
  nonRangeActions: readonly HkVisualizationNonRangeActionInput[];
  resetExpectedDescriptorHash: string;
  resetExpectedSignature: string;
  states: readonly HkVisualizationPreflightCellStateInput[];
}>;

export type HkVisualizationCanonicalPreflightState = Readonly<
  HkVisualizationPreflightCellStateInput & {
    index: number;
    inputHash: string;
    modeContextHash: string;
    rehydrationActionsHash: string;
  }
>;

export type HkVisualizationProvisionalBudget = Readonly<{
  chunkBoundaryMs: number;
  chunkCount: number;
  executionSetupMs: number;
  finalResetMs: number;
  marginMs: number;
  nonRangeActionCount: number;
  nonRangeActionMs: number;
  preflightMs: number;
  rehydrationActionCount: number;
  rehydrationActionMs: number;
  stateAndMandatoryAuditsMs: number;
  stateCount: number;
  totalMs: number;
}>;

export type HkVisualizationStateChunkBudget = Readonly<{
  chunkBoundaryMs: number;
  executionSetupMs: number;
  finalResetMs: number;
  marginMs: number;
  nonRangeActionCount: number;
  nonRangeActionMs: number;
  preflightMs: number;
  rehydrationActionCount: number;
  rehydrationActionMs: number;
  stateAndMandatoryAuditsMs: number;
  stateCount: number;
  totalMs: number;
}>;

export type HkVisualizationStateChunkPlan = Readonly<{
  budget: HkVisualizationStateChunkBudget;
  cellExecutionHash: string;
  cellId: string;
  chunkId: string;
  end: number;
  nonRangeActions: readonly HkVisualizationCanonicalNonRangeAction[];
  planHash: string;
  start: number;
  stateIds: readonly string[];
}>;

export type HkVisualizationStateCellPlan = Readonly<{
  budget: HkVisualizationProvisionalBudget;
  cellExecutionHash: string;
  cellId: string;
  chunks: readonly HkVisualizationStateChunkPlan[];
  marginMs: number;
  nonRangeActions: readonly HkVisualizationCanonicalNonRangeAction[];
  nonRangeActionsHash: string;
  planHash: string;
  resetExpectedDescriptorHash: string;
  resetExpectedSignature: string;
  states: readonly HkVisualizationCanonicalPreflightState[];
}>;

export type HkVisualizationCanonicalEvidence =
  | null
  | boolean
  | number
  | string
  | readonly HkVisualizationCanonicalEvidence[]
  | Readonly<{ [key: string]: HkVisualizationCanonicalEvidence }>;

export type HkVisualizationMandatoryAuditReceipt = Readonly<{
  auditId: HkVisualizationMandatoryStateAuditId;
  evidence: HkVisualizationCanonicalEvidence;
  evidenceHash: string;
  failure: string | null;
  issues: readonly string[];
  retryCount: number;
  status: HkVisualizationReceiptStatus;
}>;

export type HkVisualizationMandatoryAuditReceiptSet = Readonly<
  Record<
    HkVisualizationMandatoryStateAuditId,
    HkVisualizationMandatoryAuditReceipt
  >
>;

export type HkVisualizationScrollPositionAuditReceiptSet = Readonly<
  Record<
    HkVisualizationScrollPositionAuditId,
    HkVisualizationMandatoryAuditReceipt
  >
>;

export type HkVisualizationScrollContainerEvidence = Readonly<{
  clientWidth: number;
  containerKey: string;
  contentKind: "educational" | "formula" | "formula-and-surface" | "surface";
  maximumScrollLeft: number;
  scrollWidth: number;
}>;

export type HkVisualizationScrollPositionEvidence = Readonly<{
  containerKey: string;
  maximumScrollLeft: number;
  reachedScrollLeft: number;
  requestedScrollLeft: number;
  restoreReachedScrollLeft: number;
  restoreSucceeded: true;
}>;

export type HkVisualizationScrollPositiveEvidenceCounts = Readonly<{
  collisionCandidates: number;
  contrastText: number;
  controlVisibilityCandidates: number;
  hitTargetCandidates: number;
  layoutCandidates: number;
  target44Candidates: number;
}>;

export type HkVisualizationScrollObservation = Readonly<{
  audits: HkVisualizationScrollPositionAuditReceiptSet;
  observationId: string;
  position: "all-start" | "end" | "mid";
  positions: readonly HkVisualizationScrollPositionEvidence[];
  positiveEvidenceCounts: HkVisualizationScrollPositiveEvidenceCounts;
  targetContainerKey: string | null;
}>;

export type HkVisualizationScrollObservationSet = Readonly<{
  containerCount: number;
  containers: readonly HkVisualizationScrollContainerEvidence[];
  observationCount: number;
  observations: readonly HkVisualizationScrollObservation[];
  observationSetHash: string;
  scheduleHash: string;
}>;

export type HkVisualizationStateReceipt = Readonly<{
  audits: HkVisualizationMandatoryAuditReceiptSet;
  domainId: string | null;
  expectedDescriptorHash: string;
  expectedSignature: string;
  expectedSignatureHash: string;
  failure: string | null;
  inputHash: string;
  modeContextHash: string;
  modeId: string;
  observedDescriptorHash: string;
  observedSignature: string;
  observedSignatureHash: string;
  rehydrationActionsHash: string;
  retryCount: number;
  scrollObservationSet: HkVisualizationScrollObservationSet;
  stateId: string;
  stateIndex: number;
  status: HkVisualizationReceiptStatus;
}>;

export type HkVisualizationFinalResetReceipt = Readonly<{
  audits: HkVisualizationMandatoryAuditReceiptSet;
  expectedDescriptorHash: string;
  expectedSignature: string;
  expectedSignatureHash: string;
  failure: string | null;
  observedDescriptorHash: string;
  observedSignature: string;
  observedSignatureHash: string;
  retryCount: number;
  scrollObservationSet: HkVisualizationScrollObservationSet;
  status: HkVisualizationReceiptStatus;
}>;

export type HkVisualizationNonRangeActionReceipt = Readonly<{
  actionId: string;
  actionIndex: number;
  actionKind: HkVisualizationNonRangeActionKind;
  afterSignature: string;
  audits: HkVisualizationMandatoryAuditReceiptSet;
  beforeSignature: string;
  contractStateChanged: boolean;
  expectedOutcome: HkVisualizationNonRangeOutcomePolicy;
  failure: string | null;
  focusActivated: boolean;
  inputHash: string;
  meaningfulEvidenceChanged: boolean;
  retryCount: number;
  scrollObservationSet: HkVisualizationScrollObservationSet;
  status: HkVisualizationReceiptStatus;
}>;

export type HkVisualizationStateChunkReceipt = Readonly<{
  auditHash: string;
  buildHash: string;
  buildId: string;
  cellExecutionHash: string;
  cellId: string;
  chunkId: string;
  end: number;
  failure: string | null;
  finalReset: HkVisualizationFinalResetReceipt | null;
  matrixManifestHash: string;
  nonRangeActionReceipts: readonly HkVisualizationNonRangeActionReceipt[];
  planHash: string;
  retryCount: number;
  runHash: string;
  runId: string;
  start: number;
  stateReceipts: readonly HkVisualizationStateReceipt[];
  status: HkVisualizationReceiptStatus;
}>;

export type HkVisualizationStateChunkAggregateInput = Readonly<{
  auditHash: string;
  buildHash: string;
  buildId: string;
  expectedCells: readonly HkVisualizationStateCellPlan[];
  matrixManifestHash: string;
  receipts: readonly HkVisualizationStateChunkReceipt[];
  runHash: string;
  runId: string;
}>;

export type HkVisualizationZeroFailureAggregateEvidence = Readonly<{
  aggregateHash: string;
  auditedExecutionMs: number;
  auditHash: string;
  buildHash: string;
  buildId: string;
  cellCount: number;
  chunkCount: number;
  failureCount: 0;
  finalResetCount: number;
  mandatoryAuditCount: number;
  matrixManifestHash: string;
  nonRangeActionCount: number;
  planSetHash: string;
  receiptSetHash: string;
  retryCount: 0;
  runHash: string;
  runId: string;
  skippedCount: 0;
  scrollContainerCount: number;
  scrollObservationAggregateHash: string;
  scrollObservationCount: number;
  scrollObservationSetCount: number;
  scrollPositionAuditCount: number;
  stateCount: number;
  status: "passed";
  totalProvisionalBudgetMs: number;
  zeroFailures: true;
}>;

type CanonicalJsonPrimitive = null | boolean | number | string;
interface CanonicalJsonArray extends ReadonlyArray<CanonicalJsonValue> {}
interface CanonicalJsonObject {
  readonly [key: string]: CanonicalJsonValue;
}
type CanonicalJsonValue =
  CanonicalJsonPrimitive | CanonicalJsonArray | CanonicalJsonObject;

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function contractError(message: string): never {
  throw new Error(`HK visualization state-chunk contract: ${message}`);
}

function requireNonEmpty(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    contractError(`${label} must be a non-empty string.`);
  }
  return value;
}

function requireHash(label: string, value: unknown) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    contractError(`${label} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function requireExactObjectKeys(
  label: string,
  value: unknown,
  expectedKeys: readonly string[],
) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    contractError(`${label} must be a plain JSON object.`);
  }
  canonicalHkVisualizationJson(value);
  const actualKeys = Object.keys(value).sort();
  const canonicalExpectedKeys = [...expectedKeys].sort();
  if (
    canonicalHkVisualizationJson(actualKeys) !==
    canonicalHkVisualizationJson(canonicalExpectedKeys)
  ) {
    contractError(
      `${label} must contain exactly ${canonicalExpectedKeys.join(", ")}.`,
    );
  }
}

function requireNonNegativeSafeInteger(label: string, value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    contractError(`${label} must be a non-negative safe integer.`);
  }
  return value as number;
}

function requirePositiveSafeInteger(label: string, value: unknown) {
  const result = requireNonNegativeSafeInteger(label, value);
  if (result < 1) contractError(`${label} must be a positive safe integer.`);
  return result;
}

function requireSafeTotal(label: string, value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    contractError(`${label} overflowed the safe integer range.`);
  }
  return value;
}

function addSafe(label: string, ...values: readonly number[]) {
  return values.reduce((sum, value) => requireSafeTotal(label, sum + value), 0);
}

function multiplySafe(label: string, left: number, right: number) {
  return requireSafeTotal(label, left * right);
}

export function calculateHkVisualizationAuditedExecutionMs(
  observationCount: number,
) {
  const count = requirePositiveSafeInteger(
    "observationCount",
    observationCount,
  );
  if (count > HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_OBSERVATION_COUNT) {
    contractError(
      `observationCount exceeds the maximum ${HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_OBSERVATION_COUNT}.`,
    );
  }
  return addSafe(
    "auditedExecutionMs",
    HK_VISUALIZATION_PROVISIONAL_STATE_MATH_AND_SCROLL_DISCOVERY_MS,
    multiplySafe(
      "scroll observation audit reserve",
      count,
      HK_VISUALIZATION_PROVISIONAL_SCROLL_OBSERVATION_AND_SIX_AUDITS_MS,
    ),
  );
}

function canonicalizeJsonValue(
  value: unknown,
  stack: Set<object>,
  path: string,
): CanonicalJsonValue {
  if (value === null) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      contractError(`${path} contains a non-finite number.`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (typeof value !== "object") {
    contractError(`${path} contains unsupported ${typeof value} data.`);
  }
  const object = value as object;
  if (stack.has(object)) contractError(`${path} contains a cyclic reference.`);
  stack.add(object);
  try {
    if (Array.isArray(value)) {
      const allowedArrayKeys = new Set(["length"]);
      for (let index = 0; index < value.length; index += 1)
        allowedArrayKeys.add(String(index));
      for (const key of Reflect.ownKeys(value)) {
        if (typeof key !== "string" || !allowedArrayKeys.has(key)) {
          contractError(`${path} contains a non-JSON array property.`);
        }
      }
      const result: CanonicalJsonValue[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.prototype.hasOwnProperty.call(value, index)) {
          contractError(
            `${path} contains a sparse array slot at index ${index}.`,
          );
        }
        const property = Object.getOwnPropertyDescriptor(value, String(index));
        if (!property || !("value" in property) || !property.enumerable) {
          contractError(
            `${path}[${index}] must be an enumerable JSON data property.`,
          );
        }
        result.push(
          canonicalizeJsonValue(property.value, stack, `${path}[${index}]`),
        );
      }
      return result;
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      contractError(`${path} must contain only plain JSON objects.`);
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) {
      contractError(`${path} contains a symbol property.`);
    }
    const result: Record<string, CanonicalJsonValue> = Object.create(null);
    for (const key of (ownKeys as string[]).sort()) {
      const property = Object.getOwnPropertyDescriptor(value, key);
      if (!property || !("value" in property) || !property.enumerable) {
        contractError(
          `${path}.${key} must be an enumerable JSON data property.`,
        );
      }
      result[key] = canonicalizeJsonValue(
        property.value,
        stack,
        `${path}.${key}`,
      );
    }
    return result;
  } finally {
    stack.delete(object);
  }
}

/** Stable, strict JSON used by every plan, receipt, and evidence digest. */
export function canonicalHkVisualizationJson(value: unknown) {
  return JSON.stringify(canonicalizeJsonValue(value, new Set(), "$"));
}

export function sha256HkVisualizationCanonical(value: unknown) {
  return createHash("sha256")
    .update(canonicalHkVisualizationJson(value))
    .digest("hex");
}

export function hashHkVisualizationStateSignature(signature: string) {
  if (typeof signature !== "string")
    contractError("state signature must be a string.");
  return sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "state-signature",
    signature,
  });
}

export function hashHkVisualizationDescriptor(value: unknown) {
  return sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    descriptor: value,
    kind: "range-descriptor",
  });
}

export function hashHkVisualizationModeContext(
  modeContext: readonly HkVisualizationModeContextEntry[],
) {
  return sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "ordered-mode-context",
    modeContext,
  });
}

export function hashHkVisualizationRehydrationActions(
  actions: readonly HkVisualizationRehydrationAction[],
) {
  return sha256HkVisualizationCanonical({
    actions,
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "exact-rehydration-actions",
  });
}

export function hashHkVisualizationAuditEvidence(
  auditId: HkVisualizationMandatoryStateAuditId,
  evidence: unknown,
) {
  return sha256HkVisualizationCanonical({
    auditId,
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    evidence,
    kind: "mandatory-audit-evidence",
  });
}

export function hashHkVisualizationScrollObservationSchedule(input: {
  containers: readonly HkVisualizationScrollContainerEvidence[];
  observations: readonly Pick<
    HkVisualizationScrollObservation,
    "observationId" | "position" | "targetContainerKey"
  >[];
}) {
  return sha256HkVisualizationCanonical({
    containers: input.containers.map(
      ({ containerKey, contentKind, maximumScrollLeft }) => ({
        containerKey,
        contentKind,
        maximumScrollLeft,
      }),
    ),
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "scroll-observation-schedule",
    observations: input.observations,
  });
}

type HkVisualizationScrollObservationSetInput = Readonly<{
  containers: readonly HkVisualizationScrollContainerEvidence[];
  observations: readonly HkVisualizationScrollObservation[];
}>;

function finiteNonNegative(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    contractError(`${label} must be a finite non-negative number.`);
  }
  return Object.is(value, -0) ? 0 : value;
}

function validateSingleAuditReceipt(
  label: string,
  auditId: HkVisualizationMandatoryStateAuditId,
  audit: HkVisualizationMandatoryAuditReceipt,
) {
  if (!audit || typeof audit !== "object" || Array.isArray(audit)) {
    contractError(`${label} is absent.`);
  }
  // Do not canonicalize the whole receipt before the evidence-specific
  // fail-closed diagnostic below. An `undefined`, non-finite number, or other
  // non-JSON evidence value must be reported as invalid evidence rather than
  // escaping through the generic exact-object helper first.
  const actualKeys = Object.keys(audit).sort();
  const expectedKeys = [
    "auditId",
    "evidence",
    "evidenceHash",
    "failure",
    "issues",
    "retryCount",
    "status",
  ].sort();
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some((key, index) => key !== expectedKeys[index])
  ) {
    contractError(
      `${label} keys ${actualKeys.join(",")} do not exactly match ${expectedKeys.join(",")}.`,
    );
  }
  if (audit.auditId !== auditId)
    contractError(`${label} has the wrong auditId.`);
  if (audit.status !== "passed") contractError(`${label} did not pass.`);
  if (audit.failure !== null) contractError(`${label} contains a failure.`);
  if (audit.retryCount !== 0) contractError(`${label} contains a retry.`);
  requireHash(`${label}.evidenceHash`, audit.evidenceHash);
  try {
    canonicalHkVisualizationJson(audit.evidence);
  } catch (error) {
    contractError(
      `${label}.evidence must be canonical JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (evidenceIsEmpty(audit.evidence)) {
    contractError(`${label}.evidence must be non-empty.`);
  }
  if (
    audit.evidenceHash !==
    hashHkVisualizationAuditEvidence(auditId, audit.evidence)
  ) {
    contractError(`${label}.evidenceHash does not match its canonical evidence.`);
  }
  if (!Array.isArray(audit.issues) || audit.issues.length !== 0) {
    contractError(`${label} contains audit issues.`);
  }
  return Object.freeze({ ...audit });
}

export function buildHkVisualizationScrollObservationSet(
  input: HkVisualizationScrollObservationSetInput,
): HkVisualizationScrollObservationSet {
  if (!Array.isArray(input.containers)) {
    contractError("scroll containers must be an array.");
  }
  if (
    input.containers.length >
    HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_CONTAINER_COUNT
  ) {
    contractError(
      `scroll container count exceeds maximum ${HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_CONTAINER_COUNT}.`,
    );
  }
  const contentKinds = new Set<
    HkVisualizationScrollContainerEvidence["contentKind"]
  >([
    "educational",
    "formula",
    "formula-and-surface",
    "surface",
  ]);
  const seenContainerKeys = new Set<string>();
  const containers = Object.freeze(
    input.containers.map((raw, index) => {
      const label = `scroll containers[${index}]`;
      requireExactObjectKeys(label, raw, [
        "clientWidth",
        "containerKey",
        "contentKind",
        "maximumScrollLeft",
        "scrollWidth",
      ]);
      const containerKey = requireNonEmpty(
        `${label}.containerKey`,
        raw.containerKey,
      );
      if (seenContainerKeys.has(containerKey)) {
        contractError(`stable scroll container key ${containerKey} is duplicated.`);
      }
      seenContainerKeys.add(containerKey);
      const contentKind = raw.contentKind;
      if (!contentKinds.has(contentKind)) {
        contractError(`${label}.contentKind is unsupported.`);
      }
      const clientWidth = finiteNonNegative(
        `${label}.clientWidth`,
        raw.clientWidth,
      );
      const scrollWidth = finiteNonNegative(
        `${label}.scrollWidth`,
        raw.scrollWidth,
      );
      const maximumScrollLeft = finiteNonNegative(
        `${label}.maximumScrollLeft`,
        raw.maximumScrollLeft,
      );
      if (clientWidth <= 0 || scrollWidth <= clientWidth) {
        contractError(`${label} must describe a genuinely overflowing scroller.`);
      }
      if (Math.abs(scrollWidth - clientWidth - maximumScrollLeft) > 2) {
        contractError(`${label}.maximumScrollLeft does not match its dimensions.`);
      }
      return Object.freeze({
        clientWidth,
        containerKey,
        contentKind,
        maximumScrollLeft,
        scrollWidth,
      });
    }),
  );
  if (!Array.isArray(input.observations)) {
    contractError("scroll observations must be an array.");
  }
  const expectedSchedule: readonly Pick<
    HkVisualizationScrollObservation,
    "observationId" | "position" | "targetContainerKey"
  >[] = [
    { observationId: "all-start", position: "all-start", targetContainerKey: null },
    ...containers.flatMap(({ containerKey }) => [
      {
        observationId: `${containerKey}:mid`,
        position: "mid" as const,
        targetContainerKey: containerKey,
      },
      {
        observationId: `${containerKey}:end`,
        position: "end" as const,
        targetContainerKey: containerKey,
      },
    ]),
  ] as const;
  if (input.observations.length !== expectedSchedule.length) {
    contractError(
      `scroll observation schedule must contain exact all-start plus each container mid/end (${expectedSchedule.length} observations).`,
    );
  }
  const observations: readonly HkVisualizationScrollObservation[] = Object.freeze(
    input.observations.map((raw, index) => {
      const label = `scroll observations[${index}]`;
      requireExactObjectKeys(label, raw, [
        "audits",
        "observationId",
        "position",
        "positions",
        "positiveEvidenceCounts",
        "targetContainerKey",
      ]);
      const expected = expectedSchedule[index];
      if (
        raw.observationId !== expected.observationId ||
        raw.position !== expected.position ||
        raw.targetContainerKey !== expected.targetContainerKey
      ) {
        contractError(
          `${label} violates exact ordered all-start then each stable container mid/end schedule.`,
        );
      }
      if (!raw.audits || typeof raw.audits !== "object") {
        contractError(`${label} six scroll-position audits are absent.`);
      }
      if (
        canonicalHkVisualizationJson(Object.keys(raw.audits).sort()) !==
        canonicalHkVisualizationJson(
          [...HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS].sort(),
        )
      ) {
        contractError(`${label} must contain exactly all six scroll-position audits.`);
      }
      const audits = Object.freeze(
        Object.fromEntries(
          HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS.map((auditId) => [
            auditId,
            validateSingleAuditReceipt(
              `${label}.audits.${auditId}`,
              auditId,
              raw.audits[auditId],
            ),
          ]),
        ) as unknown as HkVisualizationScrollPositionAuditReceiptSet,
      );
      if (!Array.isArray(raw.positions) || raw.positions.length !== containers.length) {
        contractError(`${label}.positions must include every container exactly once.`);
      }
      const rawPositions =
        raw.positions as readonly HkVisualizationScrollPositionEvidence[];
      const positions = Object.freeze(
        rawPositions.map((rawPosition, positionIndex) => {
          const positionLabel = `${label}.positions[${positionIndex}]`;
          requireExactObjectKeys(positionLabel, rawPosition, [
            "containerKey",
            "maximumScrollLeft",
            "reachedScrollLeft",
            "requestedScrollLeft",
            "restoreReachedScrollLeft",
            "restoreSucceeded",
          ]);
          const container = containers[positionIndex];
          if (rawPosition.containerKey !== container.containerKey) {
            contractError(`${positionLabel} is out of stable container-key order.`);
          }
          const maximumScrollLeft = finiteNonNegative(
            `${positionLabel}.maximumScrollLeft`,
            rawPosition.maximumScrollLeft,
          );
          if (Math.abs(maximumScrollLeft - container.maximumScrollLeft) > 2) {
            contractError(`${positionLabel}.maximumScrollLeft drifted.`);
          }
          const requestedScrollLeft = finiteNonNegative(
            `${positionLabel}.requestedScrollLeft`,
            rawPosition.requestedScrollLeft,
          );
          const target = container.containerKey === raw.targetContainerKey;
          const expectedRequested =
            raw.position === "all-start" || !target
              ? 0
              : raw.position === "mid"
                ? Math.round(container.maximumScrollLeft / 2)
                : container.maximumScrollLeft;
          if (Math.abs(requestedScrollLeft - expectedRequested) > 2) {
            contractError(`${positionLabel}.requestedScrollLeft violates schedule.`);
          }
          const reachedScrollLeft = finiteNonNegative(
            `${positionLabel}.reachedScrollLeft`,
            rawPosition.reachedScrollLeft,
          );
          if (Math.abs(reachedScrollLeft - requestedScrollLeft) > 2) {
            contractError(`${positionLabel}.reachedScrollLeft differs from requested.`);
          }
          const restoreReachedScrollLeft = finiteNonNegative(
            `${positionLabel}.restoreReachedScrollLeft`,
            rawPosition.restoreReachedScrollLeft,
          );
          if (
            rawPosition.restoreSucceeded !== true ||
            restoreReachedScrollLeft > 2
          ) {
            contractError(`${positionLabel} failed to restore all scrollers to start.`);
          }
          return Object.freeze({
            containerKey: container.containerKey,
            maximumScrollLeft,
            reachedScrollLeft,
            requestedScrollLeft,
            restoreReachedScrollLeft,
            restoreSucceeded: true as const,
          });
        }),
      );
      requireExactObjectKeys(
        `${label}.positiveEvidenceCounts`,
        raw.positiveEvidenceCounts,
        [
          "collisionCandidates",
          "contrastText",
          "controlVisibilityCandidates",
          "hitTargetCandidates",
          "layoutCandidates",
          "target44Candidates",
        ],
      );
      const positiveEvidenceCounts = Object.freeze(
        Object.fromEntries(
          Object.entries(raw.positiveEvidenceCounts).map(([key, value]) => [
            key,
            requirePositiveSafeInteger(
              `${label}.positiveEvidenceCounts.${key}`,
              value,
            ),
          ]),
        ) as unknown as HkVisualizationScrollPositiveEvidenceCounts,
      );
      return Object.freeze({
        audits,
        observationId: expected.observationId,
        position: expected.position,
        positions,
        positiveEvidenceCounts,
        targetContainerKey: expected.targetContainerKey,
      });
    }),
  );
  const scheduleHash = hashHkVisualizationScrollObservationSchedule({
    containers,
    observations,
  });
  const withoutHash = {
    containerCount: containers.length,
    containers,
    observationCount: observations.length,
    observations,
    scheduleHash,
  };
  return Object.freeze({
    ...withoutHash,
    observationSetHash: sha256HkVisualizationCanonical({
      contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
      kind: "scroll-observation-set",
      value: withoutHash,
    }),
  });
}

export function hashHkVisualizationMatrixManifest(
  expectedCells: readonly HkVisualizationStateCellPlan[],
) {
  return sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    expectedCells,
    kind: "matrix-manifest",
  });
}

export function deriveHkVisualizationRunHash(input: {
  auditHash: string;
  buildHash: string;
  buildId: string;
  matrixManifestHash: string;
  runId: string;
}) {
  return sha256HkVisualizationCanonical({
    auditHash: requireHash("auditHash", input.auditHash),
    buildHash: requireHash("buildHash", input.buildHash),
    buildId: requireNonEmpty("buildId", input.buildId),
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "bound-run",
    matrixManifestHash: requireHash(
      "matrixManifestHash",
      input.matrixManifestHash,
    ),
    runId: requireNonEmpty("runId", input.runId),
  });
}

function canonicalNonRangeActions(
  rawActions: readonly HkVisualizationNonRangeActionInput[],
) {
  if (!Array.isArray(rawActions)) {
    contractError("nonRangeActions must be an array.");
  }
  const actionKinds = new Set<HkVisualizationNonRangeActionKind>([
    "click",
    "focus",
    "keyboard-activate",
    "keyboard-adjust",
    "set-value",
  ]);
  const outcomePolicies = new Set<HkVisualizationNonRangeOutcomePolicy>([
    "exact-no-change",
    "focus-activate",
    "meaningful-change",
    "state-change",
  ]);
  const seenActionIds = new Set<string>();
  return Object.freeze(
    rawActions.map((rawAction, index) => {
      const label = `nonRangeActions[${index}]`;
      requireExactObjectKeys(label, rawAction, [
        "actionId",
        "actionKind",
        "expectedOutcome",
        "requestedValue",
        "selector",
        "targetId",
      ]);
      const actionId = requireNonEmpty(`${label}.actionId`, rawAction.actionId);
      if (seenActionIds.has(actionId)) {
        contractError(`non-range action ${actionId} is duplicated.`);
      }
      seenActionIds.add(actionId);
      if (!actionKinds.has(rawAction.actionKind)) {
        contractError(`${label}.actionKind is unsupported.`);
      }
      if (!outcomePolicies.has(rawAction.expectedOutcome)) {
        contractError(`${label}.expectedOutcome is unsupported.`);
      }
      let requestedValue: number | string | null = rawAction.requestedValue;
      if (rawAction.actionKind === "set-value") {
        if (!(
          (typeof requestedValue === "number" &&
            Number.isFinite(requestedValue)) ||
          (typeof requestedValue === "string" &&
            requestedValue.trim().length > 0)
        )) {
          contractError(
            `${label} set-value requestedValue must be a finite number or non-empty string.`,
          );
        }
        if (typeof requestedValue === "number" && Object.is(requestedValue, -0))
          requestedValue = 0;
      } else if (rawAction.actionKind === "keyboard-activate") {
        if (requestedValue !== "Enter" && requestedValue !== "Space") {
          contractError(
            `${label} keyboard-activate requestedValue must be Enter or Space.`,
          );
        }
      } else if (rawAction.actionKind === "keyboard-adjust") {
        if (
          requestedValue !== "ArrowRight" &&
          requestedValue !== "ArrowUp" &&
          requestedValue !== "Home" &&
          requestedValue !== "End"
        ) {
          contractError(
            `${label} keyboard-adjust requestedValue must be ArrowRight, ArrowUp, Home, or End.`,
          );
        }
      } else if (requestedValue !== null) {
        contractError(
          `${label} ${rawAction.actionKind} requestedValue must be null.`,
        );
      }
      const normalized = {
        actionId,
        actionKind: rawAction.actionKind,
        expectedOutcome: rawAction.expectedOutcome,
        index,
        requestedValue,
        selector: requireNonEmpty(`${label}.selector`, rawAction.selector),
        targetId: requireNonEmpty(`${label}.targetId`, rawAction.targetId),
      };
      return Object.freeze({
        ...normalized,
        inputHash: sha256HkVisualizationCanonical({
          action: normalized,
          contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
          kind: "non-range-action",
        }),
      });
    }),
  );
}

export function hashHkVisualizationNonRangeActions(
  actions: readonly HkVisualizationCanonicalNonRangeAction[],
) {
  return sha256HkVisualizationCanonical({
    actions,
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "ordered-non-range-actions",
  });
}

export function calculateHkVisualizationProvisionalBudget(
  input: Readonly<{
    marginMs: number;
    nonRangeActions: readonly HkVisualizationNonRangeActionInput[];
    rehydrationActionCount: number;
    stateCount: number;
  }>,
): HkVisualizationProvisionalBudget {
  const stateCount = requireNonNegativeSafeInteger(
    "stateCount",
    input.stateCount,
  );
  const nonRangeActionCount = canonicalNonRangeActions(
    input.nonRangeActions,
  ).length;
  const rehydrationActionCount = requireNonNegativeSafeInteger(
    "rehydrationActionCount",
    input.rehydrationActionCount,
  );
  const marginMs = requireNonNegativeSafeInteger("marginMs", input.marginMs);
  if (marginMs !== HK_VISUALIZATION_PROVISIONAL_MARGIN_MS) {
    contractError(
      `marginMs must equal the exact ${HK_VISUALIZATION_PROVISIONAL_MARGIN_MS}ms reserve.`,
    );
  }
  const chunkCount = Math.ceil(
    stateCount / HK_VISUALIZATION_STATE_CHUNK_MAXIMUM_SIZE,
  );
  const executionSetupMs = multiplySafe(
    "executionSetupMs",
    chunkCount,
    HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS,
  );
  const stateAndMandatoryAuditsMs = multiplySafe(
    "stateAndMandatoryAuditsMs",
    stateCount,
    HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS,
  );
  const chunkBoundaryMs = multiplySafe(
    "chunkBoundaryMs",
    chunkCount,
    HK_VISUALIZATION_PROVISIONAL_CHUNK_BOUNDARY_MS,
  );
  const rehydrationActionMs = multiplySafe(
    "rehydrationActionMs",
    rehydrationActionCount,
    HK_VISUALIZATION_PROVISIONAL_REHYDRATION_ACTION_MS,
  );
  const nonRangeActionMs = multiplySafe(
    "nonRangeActionMs",
    nonRangeActionCount,
    HK_VISUALIZATION_PROVISIONAL_NON_RANGE_ACTION_MS,
  );
  const totalMs = addSafe(
    "totalMs",
    HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS,
    executionSetupMs,
    stateAndMandatoryAuditsMs,
    chunkBoundaryMs,
    rehydrationActionMs,
    nonRangeActionMs,
    HK_VISUALIZATION_PROVISIONAL_FINAL_RESET_MS,
    marginMs,
  );
  return Object.freeze({
    chunkBoundaryMs,
    chunkCount,
    executionSetupMs,
    finalResetMs: HK_VISUALIZATION_PROVISIONAL_FINAL_RESET_MS,
    marginMs,
    nonRangeActionCount,
    nonRangeActionMs,
    preflightMs: HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS,
    rehydrationActionCount,
    rehydrationActionMs,
    stateAndMandatoryAuditsMs,
    stateCount,
    totalMs,
  });
}

function actionValue(label: string, value: unknown) {
  if (typeof value === "string") return requireNonEmpty(label, value);
  if (typeof value === "number" && Number.isFinite(value)) {
    return Object.is(value, -0) ? 0 : value;
  }
  contractError(`${label} must be a non-empty string or finite number.`);
}

function canonicalRehydrationActions(
  stateIndex: number,
  rawActions: readonly HkVisualizationRehydrationAction[],
) {
  if (!Array.isArray(rawActions)) {
    contractError(`states[${stateIndex}].rehydrationActions must be an array.`);
  }
  const seenActionIds = new Set<string>();
  const earlierActions = new Map<string, HkVisualizationRehydrationAction>();
  return Object.freeze(
    rawActions.map((rawAction, actionIndex) => {
      const label = `states[${stateIndex}].rehydrationActions[${actionIndex}]`;
      requireExactObjectKeys(label, rawAction, [
        "actionId",
        "actionKind",
        "controlId",
        "expectedValue",
        "projectedAbsence",
        "requestedValue",
        "selector",
        "targetPolicy",
      ]);
      const actionId = requireNonEmpty(`${label}.actionId`, rawAction.actionId);
      if (seenActionIds.has(actionId)) {
        contractError(`rehydration action ${actionId} is duplicated.`);
      }
      seenActionIds.add(actionId);
      if (
        rawAction.actionKind !== "activate-mode" &&
        rawAction.actionKind !== "set-range-value"
      ) {
        contractError(`${label}.actionKind is unsupported.`);
      }
      const controlId =
        rawAction.actionKind === "activate-mode"
          ? rawAction.controlId === null
            ? null
            : contractError(`${label} activate-mode controlId must be null.`)
          : requireNonEmpty(`${label}.controlId`, rawAction.controlId);
      if (
        rawAction.targetPolicy !== "required-interactive" &&
        rawAction.targetPolicy !== "projected-fixed-node"
      ) {
        contractError(`${label}.targetPolicy is unsupported.`);
      }
      if (
        rawAction.actionKind === "activate-mode" &&
        rawAction.targetPolicy !== "required-interactive"
      ) {
        contractError(
          `${label} activate-mode must target required-interactive.`,
        );
      }
      const expectedValue = actionValue(
        `${label}.expectedValue`,
        rawAction.expectedValue,
      );
      let projectedAbsence: HkVisualizationProjectedAbsence | null;
      if (rawAction.targetPolicy === "required-interactive") {
        if (rawAction.projectedAbsence !== null) {
          contractError(
            `${label} required-interactive ordinary action must carry null metadata.`,
          );
        }
        projectedAbsence = null;
      } else {
        if (rawAction.actionKind !== "set-range-value") {
          contractError(
            `${label} projected-fixed-node must be a set-range-value action.`,
          );
        }
        const metadata = rawAction.projectedAbsence;
        if (!metadata || typeof metadata !== "object") {
          contractError(
            `${label} projected-fixed-node requires projection metadata.`,
          );
        }
        requireExactObjectKeys(`${label}.projectedAbsence`, metadata, [
          "controllerActionId",
          "fixedNodeSelector",
          "fixedValue",
          "projection",
          "reason",
        ]);
        const controllerActionId = requireNonEmpty(
          `${label}.projectedAbsence.controllerActionId`,
          metadata.controllerActionId,
        );
        const controller = earlierActions.get(controllerActionId);
        if (
          !controller ||
          controller.actionKind !== "set-range-value" ||
          controller.targetPolicy !== "required-interactive"
        ) {
          contractError(
            `${label} projected absence must bind an earlier controller action that is required-interactive with kind set-range-value.`,
          );
        }
        if (metadata.projection !== "clamp-and-visibility") {
          contractError(
            `${label}.projectedAbsence.projection must be clamp-and-visibility.`,
          );
        }
        const fixedValue = actionValue(
          `${label}.projectedAbsence.fixedValue`,
          metadata.fixedValue,
        );
        if (fixedValue !== expectedValue) {
          contractError(
            `${label}.projectedAbsence.fixedValue must equal the dependent action expectedValue.`,
          );
        }
        projectedAbsence = Object.freeze({
          controllerActionId,
          fixedNodeSelector: requireNonEmpty(
            `${label}.projectedAbsence.fixedNodeSelector`,
            metadata.fixedNodeSelector,
          ),
          fixedValue,
          projection: metadata.projection,
          reason: requireNonEmpty(
            `${label}.projectedAbsence.reason`,
            metadata.reason,
          ),
        });
      }
      const normalized = Object.freeze({
        actionId,
        actionKind: rawAction.actionKind,
        controlId,
        expectedValue,
        projectedAbsence,
        requestedValue: actionValue(
          `${label}.requestedValue`,
          rawAction.requestedValue,
        ),
        selector: requireNonEmpty(`${label}.selector`, rawAction.selector),
        targetPolicy: rawAction.targetPolicy,
      });
      earlierActions.set(actionId, normalized);
      return normalized;
    }),
  );
}

function canonicalModeContext(
  stateIndex: number,
  rawContext: readonly HkVisualizationModeContextEntry[],
  actions: readonly HkVisualizationRehydrationAction[],
) {
  if (!Array.isArray(rawContext)) {
    contractError(`states[${stateIndex}].modeContext must be an array.`);
  }
  const actionsById = new Map(
    actions.map((action) => [action.actionId, action]),
  );
  const actionIndexById = new Map(
    actions.map((action, index) => [action.actionId, index]),
  );
  const seenGroups = new Set<string>();
  const seenReplayActionIds = new Set<string>();
  let previousReplayActionIndex = -1;
  const context = rawContext.map((rawGroup, contextIndex) => {
    const label = `states[${stateIndex}].modeContext[${contextIndex}]`;
    const groupId = requireNonEmpty(`${label}.groupId`, rawGroup.groupId);
    if (seenGroups.has(groupId)) {
      contractError(`mode group ${groupId} is duplicated.`);
    }
    const dependsOnGroupId =
      rawGroup.dependsOnGroupId === null
        ? null
        : requireNonEmpty(
            `${label}.dependsOnGroupId`,
            rawGroup.dependsOnGroupId,
          );
    if (dependsOnGroupId === groupId) {
      contractError(`mode group ${groupId} cannot depend on itself.`);
    }
    if (dependsOnGroupId && !seenGroups.has(dependsOnGroupId)) {
      contractError(
        `mode group ${groupId} dependency ${dependsOnGroupId} must precede it in the exact ordered mode context.`,
      );
    }
    const activeModeId = requireNonEmpty(
      `${label}.activeModeId`,
      rawGroup.activeModeId,
    );
    const replayActionId = requireNonEmpty(
      `${label}.replayActionId`,
      rawGroup.replayActionId,
    );
    if (seenReplayActionIds.has(replayActionId)) {
      contractError(`mode replay action ${replayActionId} is duplicated.`);
    }
    const replaySelector = requireNonEmpty(
      `${label}.replaySelector`,
      rawGroup.replaySelector,
    );
    const action = actionsById.get(replayActionId);
    if (!action) {
      contractError(
        `${label}.replayActionId ${replayActionId} has no matching rehydration action.`,
      );
    }
    if (action.actionKind !== "activate-mode") {
      contractError(
        `${label}.replayActionId ${replayActionId} must identify an activate-mode action.`,
      );
    }
    if (action.selector !== replaySelector) {
      contractError(`${label} replay selector differs from its action.`);
    }
    if (
      action.requestedValue !== activeModeId ||
      action.expectedValue !== activeModeId
    ) {
      contractError(`${label} replay action does not identify activeModeId.`);
    }
    const replayActionIndex = actionIndexById.get(replayActionId);
    if (
      replayActionIndex === undefined ||
      replayActionIndex <= previousReplayActionIndex
    ) {
      contractError(
        `${label} replay action is not in exact mode-context order.`,
      );
    }
    previousReplayActionIndex = replayActionIndex;
    seenGroups.add(groupId);
    seenReplayActionIds.add(replayActionId);
    return Object.freeze({
      activeModeId,
      dependsOnGroupId,
      groupId,
      replayActionId,
      replaySelector,
    });
  });
  for (const action of actions) {
    if (
      action.actionKind === "activate-mode" &&
      !seenReplayActionIds.has(action.actionId)
    ) {
      contractError(
        `activate-mode rehydration action ${action.actionId} has no mode-context owner.`,
      );
    }
  }
  return Object.freeze(context);
}

function canonicalState(
  rawState: HkVisualizationPreflightCellStateInput,
  index: number,
  seenStateIds: Set<string>,
): HkVisualizationCanonicalPreflightState {
  const id = requireNonEmpty(`states[${index}].id`, rawState.id);
  if (seenStateIds.has(id)) contractError(`state id ${id} is duplicated.`);
  seenStateIds.add(id);
  const modeId = requireNonEmpty(`states[${index}].modeId`, rawState.modeId);
  const domainId =
    rawState.domainId === null
      ? null
      : requireNonEmpty(`states[${index}].domainId`, rawState.domainId);
  requireHash(`states[${index}].descriptorHash`, rawState.descriptorHash);
  if (!Array.isArray(rawState.orderedControlIds)) {
    contractError(`states[${index}].orderedControlIds must be an array.`);
  }
  const orderedControlIds = rawState.orderedControlIds.map(
    (controlId, controlIndex) =>
      requireNonEmpty(
        `states[${index}].orderedControlIds[${controlIndex}]`,
        controlId,
      ),
  );
  if (new Set(orderedControlIds).size !== orderedControlIds.length) {
    contractError(`states[${index}].orderedControlIds contains a duplicate.`);
  }
  if (!Array.isArray(rawState.reasons) || rawState.reasons.length === 0) {
    contractError(`states[${index}].reasons must contain at least one reason.`);
  }
  const reasons = rawState.reasons.map((reason, reasonIndex) =>
    requireNonEmpty(`states[${index}].reasons[${reasonIndex}]`, reason),
  );
  const rehydrationActions = canonicalRehydrationActions(
    index,
    rawState.rehydrationActions,
  );
  for (const controlId of orderedControlIds) {
    const matchingActions = rehydrationActions.filter(
      (action) =>
        action.actionKind === "set-range-value" &&
        action.controlId === controlId,
    );
    if (matchingActions.length !== 1) {
      contractError(
        `states[${index}] ordered control ${controlId} must retain exactly one set-range-value action.`,
      );
    }
  }
  for (const action of rehydrationActions) {
    if (
      action.actionKind === "set-range-value" &&
      (action.controlId === null ||
        !orderedControlIds.includes(action.controlId))
    ) {
      contractError(
        `states[${index}] set-range-value action ${action.actionId} references undeclared control ${action.controlId}.`,
      );
    }
  }
  const modeContext = canonicalModeContext(
    index,
    rawState.modeContext,
    rehydrationActions,
  );
  const modeContextHash = hashHkVisualizationModeContext(modeContext);
  const rehydrationActionsHash =
    hashHkVisualizationRehydrationActions(rehydrationActions);
  const normalized = {
    actionSignature: requireNonEmpty(
      `states[${index}].actionSignature`,
      rawState.actionSignature,
    ),
    descriptorHash: rawState.descriptorHash,
    domainId,
    expectedSignature: requireNonEmpty(
      `states[${index}].expectedSignature`,
      rawState.expectedSignature,
    ),
    id,
    index,
    modeContext,
    modeContextHash,
    modeId,
    orderedControlIds: Object.freeze([...orderedControlIds]),
    reasons: Object.freeze([...reasons]),
    rehydrationActions,
    rehydrationActionsHash,
    requestedSignature: requireNonEmpty(
      `states[${index}].requestedSignature`,
      rawState.requestedSignature,
    ),
    startingSignature: requireNonEmpty(
      `states[${index}].startingSignature`,
      rawState.startingSignature,
    ),
  };
  const inputHash = sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "preflight-state",
    state: normalized,
  });
  return Object.freeze({ ...normalized, inputHash });
}

function chunkIdFor(
  cellId: string,
  planHash: string,
  start: number,
  end: number,
) {
  return sha256HkVisualizationCanonical({
    cellId,
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    end,
    kind: "state-chunk",
    planHash,
    start,
  });
}

function deterministicShare(total: number, index: number, count: number) {
  if (count <= 0) contractError("budget share count must be positive.");
  const quotient = Math.floor(total / count);
  return quotient + (index < total % count ? 1 : 0);
}

function buildChunks(
  cellId: string,
  planHash: string,
  states: readonly HkVisualizationCanonicalPreflightState[],
  nonRangeActions: readonly HkVisualizationCanonicalNonRangeAction[],
  budget: HkVisualizationProvisionalBudget,
) {
  const chunks: Array<
    Omit<HkVisualizationStateChunkPlan, "cellExecutionHash">
  > = [];
  for (
    let start = 0;
    start < states.length;
    start += HK_VISUALIZATION_STATE_CHUNK_MAXIMUM_SIZE
  ) {
    const end = Math.min(
      states.length,
      start + HK_VISUALIZATION_STATE_CHUNK_MAXIMUM_SIZE,
    );
    const chunkIndex = chunks.length;
    const chunkStates = states.slice(start, end);
    const stateCount = chunkStates.length;
    const rehydrationActionCount = chunkStates.reduce(
      (sum, state) => sum + state.rehydrationActions.length,
      0,
    );
    // Non-range interactions execute once after the cell's range-state scan
    // and immediately before its final reset. Binding the complete ordered
    // plan only to the final chunk prevents both replay and silent omission.
    const chunkNonRangeActions =
      end === states.length ? nonRangeActions : Object.freeze([]);
    const nonRangeActionCount = chunkNonRangeActions.length;
    const chunkBudgetWithoutTotal = {
      chunkBoundaryMs: HK_VISUALIZATION_PROVISIONAL_CHUNK_BOUNDARY_MS,
      executionSetupMs: HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS,
      finalResetMs:
        end === states.length ? HK_VISUALIZATION_PROVISIONAL_FINAL_RESET_MS : 0,
      marginMs: deterministicShare(
        budget.marginMs,
        chunkIndex,
        budget.chunkCount,
      ),
      nonRangeActionCount,
      nonRangeActionMs: multiplySafe(
        "chunk nonRangeActionMs",
        nonRangeActionCount,
        HK_VISUALIZATION_PROVISIONAL_NON_RANGE_ACTION_MS,
      ),
      preflightMs: deterministicShare(
        budget.preflightMs,
        chunkIndex,
        budget.chunkCount,
      ),
      rehydrationActionCount,
      rehydrationActionMs: multiplySafe(
        "chunk rehydrationActionMs",
        rehydrationActionCount,
        HK_VISUALIZATION_PROVISIONAL_REHYDRATION_ACTION_MS,
      ),
      stateAndMandatoryAuditsMs: multiplySafe(
        "chunk stateAndMandatoryAuditsMs",
        stateCount,
        HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS,
      ),
      stateCount,
    };
    const chunkBudget = Object.freeze({
      ...chunkBudgetWithoutTotal,
      totalMs: addSafe(
        "chunk totalMs",
        chunkBudgetWithoutTotal.preflightMs,
        chunkBudgetWithoutTotal.executionSetupMs,
        chunkBudgetWithoutTotal.stateAndMandatoryAuditsMs,
        chunkBudgetWithoutTotal.chunkBoundaryMs,
        chunkBudgetWithoutTotal.rehydrationActionMs,
        chunkBudgetWithoutTotal.nonRangeActionMs,
        chunkBudgetWithoutTotal.finalResetMs,
        chunkBudgetWithoutTotal.marginMs,
      ),
    });
    chunks.push(
      Object.freeze({
        budget: chunkBudget,
        cellId,
        chunkId: chunkIdFor(cellId, planHash, start, end),
        end,
        nonRangeActions: chunkNonRangeActions,
        planHash,
        start,
        stateIds: Object.freeze(chunkStates.map(({ id }) => id)),
      }),
    );
  }
  const chunkTotal = chunks.reduce(
    (sum, chunk) => addSafe("chunk budget total", sum, chunk.budget.totalMs),
    0,
  );
  if (chunkTotal !== budget.totalMs) {
    contractError("exact chunk budgets do not reproduce the cell total.");
  }
  return Object.freeze(chunks);
}

export function buildHkVisualizationStateCellPlan(
  input: HkVisualizationStateCellPlanInput,
): HkVisualizationStateCellPlan {
  const cellId = requireNonEmpty("cellId", input.cellId);
  if (!Array.isArray(input.states) || input.states.length === 0) {
    contractError("states must contain at least one executable state.");
  }
  const resetExpectedSignature = requireNonEmpty(
    "resetExpectedSignature",
    input.resetExpectedSignature,
  );
  const resetExpectedDescriptorHash = requireHash(
    "resetExpectedDescriptorHash",
    input.resetExpectedDescriptorHash,
  );
  const nonRangeActions = canonicalNonRangeActions(input.nonRangeActions);
  const nonRangeActionsHash =
    hashHkVisualizationNonRangeActions(nonRangeActions);
  const seenStateIds = new Set<string>();
  const states = Object.freeze(
    input.states.map((state, index) =>
      canonicalState(state, index, seenStateIds),
    ),
  );
  const rehydrationActionCount = states.reduce(
    (sum, state) =>
      requireSafeTotal(
        "rehydrationActionCount",
        sum + state.rehydrationActions.length,
      ),
    0,
  );
  const budget = calculateHkVisualizationProvisionalBudget({
    marginMs: input.marginMs,
    nonRangeActions: input.nonRangeActions,
    rehydrationActionCount,
    stateCount: states.length,
  });
  const planHash = sha256HkVisualizationCanonical({
    budget,
    cellId,
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "cell-plan",
    marginMs: input.marginMs,
    nonRangeActions,
    nonRangeActionsHash,
    resetExpectedDescriptorHash,
    resetExpectedSignature,
    states,
  });
  const rawChunks = buildChunks(
    cellId,
    planHash,
    states,
    nonRangeActions,
    budget,
  );
  const cellExecutionHash = sha256HkVisualizationCanonical({
    budget,
    cellId,
    chunks: rawChunks,
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "cell-execution",
    planHash,
  });
  const chunks = Object.freeze(
    rawChunks.map((chunk) =>
      Object.freeze({
        ...chunk,
        cellExecutionHash,
      }),
    ),
  );
  return Object.freeze({
    budget,
    cellExecutionHash,
    cellId,
    chunks,
    marginMs: input.marginMs,
    nonRangeActions,
    nonRangeActionsHash,
    planHash,
    resetExpectedDescriptorHash,
    resetExpectedSignature,
    states,
  });
}

function validateExpectedCellPlan(cell: HkVisualizationStateCellPlan) {
  const rebuilt = buildHkVisualizationStateCellPlan({
    cellId: cell.cellId,
    marginMs: cell.marginMs,
    nonRangeActions: cell.nonRangeActions.map((action) => ({
      actionId: action.actionId,
      actionKind: action.actionKind,
      expectedOutcome: action.expectedOutcome,
      requestedValue: action.requestedValue,
      selector: action.selector,
      targetId: action.targetId,
    })),
    resetExpectedDescriptorHash: cell.resetExpectedDescriptorHash,
    resetExpectedSignature: cell.resetExpectedSignature,
    states: cell.states.map((state) => ({
      actionSignature: state.actionSignature,
      descriptorHash: state.descriptorHash,
      domainId: state.domainId,
      expectedSignature: state.expectedSignature,
      id: state.id,
      modeContext: state.modeContext,
      modeId: state.modeId,
      orderedControlIds: state.orderedControlIds,
      reasons: state.reasons,
      rehydrationActions: state.rehydrationActions,
      requestedSignature: state.requestedSignature,
      startingSignature: state.startingSignature,
    })),
  });
  if (
    canonicalHkVisualizationJson(rebuilt) !== canonicalHkVisualizationJson(cell)
  ) {
    contractError(
      `expected cell ${cell.cellId} is not a canonical, internally consistent plan.`,
    );
  }
}

function evidenceIsEmpty(evidence: HkVisualizationCanonicalEvidence) {
  if (evidence === null) return true;
  if (typeof evidence === "string") return evidence.trim().length === 0;
  if (Array.isArray(evidence)) return evidence.length === 0;
  if (typeof evidence === "object") return Object.keys(evidence).length === 0;
  return false;
}

function validateAuditSet(
  label: string,
  audits: HkVisualizationMandatoryAuditReceiptSet,
) {
  if (!audits || typeof audits !== "object" || Array.isArray(audits)) {
    contractError(`${label} mandatory audits are absent.`);
  }
  const actualAuditIds = Object.keys(audits).sort();
  const expectedAuditIds = [
    ...HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS,
  ].sort();
  if (
    canonicalHkVisualizationJson(actualAuditIds) !==
    canonicalHkVisualizationJson(expectedAuditIds)
  ) {
    contractError(`${label} must contain exactly every mandatory audit.`);
  }
  for (const auditId of HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS) {
    validateSingleAuditReceipt(
      `${label}.${auditId}`,
      auditId,
      audits[auditId],
    );
  }
}

function validateScrollObservationSet(
  label: string,
  raw: HkVisualizationScrollObservationSet,
  topLevelAudits: HkVisualizationMandatoryAuditReceiptSet,
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    contractError(`${label} is absent.`);
  }
  requireExactObjectKeys(label, raw, [
    "containerCount",
    "containers",
    "observationCount",
    "observations",
    "observationSetHash",
    "scheduleHash",
  ]);
  requireHash(`${label}.scheduleHash`, raw.scheduleHash);
  requireHash(`${label}.observationSetHash`, raw.observationSetHash);
  const rebuilt = buildHkVisualizationScrollObservationSet({
    containers: raw.containers,
    observations: raw.observations,
  });
  if (
    raw.containerCount !== rebuilt.containerCount ||
    raw.observationCount !== rebuilt.observationCount ||
    raw.scheduleHash !== rebuilt.scheduleHash ||
    raw.observationSetHash !== rebuilt.observationSetHash ||
    canonicalHkVisualizationJson(raw) !== canonicalHkVisualizationJson(rebuilt)
  ) {
    contractError(`${label} count, order, or hash binding drifted.`);
  }
  const allStart = rebuilt.observations[0];
  for (const auditId of HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS) {
    if (
      allStart.audits[auditId].evidenceHash !==
      topLevelAudits[auditId].evidenceHash
    ) {
      contractError(
        `${label} all-start ${auditId} hash differs from its top-level audit.`,
      );
    }
  }
  return rebuilt;
}

function validateObservation(
  label: string,
  receipt: Pick<
    HkVisualizationStateReceipt,
    | "audits"
    | "expectedDescriptorHash"
    | "expectedSignature"
    | "expectedSignatureHash"
    | "failure"
    | "observedDescriptorHash"
    | "observedSignature"
    | "observedSignatureHash"
    | "retryCount"
    | "scrollObservationSet"
    | "status"
  >,
  expectedSignature: string,
  expectedDescriptorHash: string,
) {
  if (receipt.status !== "passed") contractError(`${label} did not pass.`);
  if (receipt.failure !== null) contractError(`${label} contains a failure.`);
  if (receipt.retryCount !== 0) contractError(`${label} contains a retry.`);
  if (receipt.expectedSignature !== expectedSignature) {
    contractError(`${label} has the wrong expected signature.`);
  }
  if (receipt.observedSignature !== expectedSignature) {
    contractError(
      `${label} observed signature does not equal the preflight expectation.`,
    );
  }
  const signatureHash = hashHkVisualizationStateSignature(expectedSignature);
  if (receipt.expectedSignatureHash !== signatureHash) {
    contractError(`${label} has the wrong expected signature hash.`);
  }
  if (
    receipt.observedSignatureHash !==
    hashHkVisualizationStateSignature(receipt.observedSignature)
  ) {
    contractError(`${label} has the wrong observed signature hash.`);
  }
  if (receipt.expectedSignatureHash !== receipt.observedSignatureHash) {
    contractError(`${label} expected and observed signature hashes differ.`);
  }
  if (receipt.expectedDescriptorHash !== expectedDescriptorHash) {
    contractError(`${label} has the wrong expected descriptor hash.`);
  }
  if (receipt.observedDescriptorHash !== expectedDescriptorHash) {
    contractError(`${label} observed descriptor hash differs from preflight.`);
  }
  validateAuditSet(`${label}.audits`, receipt.audits);
  return validateScrollObservationSet(
    `${label}.scrollObservationSet`,
    receipt.scrollObservationSet,
    receipt.audits,
  );
}

function validateStateReceipt(
  receipt: HkVisualizationStateReceipt,
  expected: HkVisualizationCanonicalPreflightState,
  label: string,
) {
  if (receipt.stateId !== expected.id)
    contractError(`${label} has the wrong stateId or is out of order.`);
  if (receipt.stateIndex !== expected.index)
    contractError(`${label} has the wrong stateIndex.`);
  if (receipt.inputHash !== expected.inputHash)
    contractError(`${label} has the wrong preflight input hash.`);
  if (receipt.modeId !== expected.modeId)
    contractError(`${label} has the wrong modeId.`);
  if (receipt.domainId !== expected.domainId)
    contractError(`${label} has the wrong domainId.`);
  if (receipt.modeContextHash !== expected.modeContextHash) {
    contractError(`${label} has the wrong mode context hash.`);
  }
  if (receipt.rehydrationActionsHash !== expected.rehydrationActionsHash) {
    contractError(`${label} has the wrong rehydration actions hash.`);
  }
  return validateObservation(
    label,
    receipt,
    expected.expectedSignature,
    expected.descriptorHash,
  );
}

function validateNonRangeActionReceipt(
  receipt: HkVisualizationNonRangeActionReceipt,
  expected: HkVisualizationCanonicalNonRangeAction,
  label: string,
) {
  if (receipt.actionId !== expected.actionId) {
    contractError(
      `${label} has the wrong non-range actionId or is out of order.`,
    );
  }
  if (receipt.actionIndex !== expected.index) {
    contractError(`${label} has the wrong actionIndex.`);
  }
  if (receipt.inputHash !== expected.inputHash) {
    contractError(`${label} has the wrong non-range input hash.`);
  }
  if (receipt.actionKind !== expected.actionKind) {
    contractError(`${label} has the wrong actionKind.`);
  }
  if (receipt.expectedOutcome !== expected.expectedOutcome) {
    contractError(`${label} has the wrong expected outcome policy.`);
  }
  if (receipt.status !== "passed") contractError(`${label} did not pass.`);
  if (receipt.failure !== null) contractError(`${label} contains a failure.`);
  if (receipt.retryCount !== 0) contractError(`${label} contains a retry.`);
  const beforeSignature = requireNonEmpty(
    `${label}.beforeSignature`,
    receipt.beforeSignature,
  );
  const afterSignature = requireNonEmpty(
    `${label}.afterSignature`,
    receipt.afterSignature,
  );
  for (const [name, value] of [
    ["contractStateChanged", receipt.contractStateChanged],
    ["focusActivated", receipt.focusActivated],
    ["meaningfulEvidenceChanged", receipt.meaningfulEvidenceChanged],
  ] as const) {
    if (typeof value !== "boolean") {
      contractError(`${label}.${name} must be boolean.`);
    }
  }
  if (expected.expectedOutcome === "state-change") {
    if (beforeSignature === afterSignature) {
      contractError(`${label} state-change requires different signatures.`);
    }
    if (!receipt.contractStateChanged) {
      contractError(`${label} state-change requires contractStateChanged.`);
    }
  } else if (expected.expectedOutcome === "meaningful-change") {
    if (beforeSignature === afterSignature) {
      contractError(
        `${label} meaningful-change requires different signatures.`,
      );
    }
    if (!receipt.meaningfulEvidenceChanged) {
      contractError(
        `${label} meaningful-change requires meaningfulEvidenceChanged.`,
      );
    }
  } else if (expected.expectedOutcome === "exact-no-change") {
    if (beforeSignature !== afterSignature) {
      contractError(`${label} exact-no-change requires identical signatures.`);
    }
    if (
      receipt.contractStateChanged ||
      receipt.meaningfulEvidenceChanged ||
      receipt.focusActivated
    ) {
      contractError(`${label} exact-no-change forbids change claims.`);
    }
  } else {
    if (!receipt.focusActivated) {
      contractError(`${label} focus-activate requires focusActivated.`);
    }
  }
  validateAuditSet(`${label}.audits`, receipt.audits);
  return validateScrollObservationSet(
    `${label}.scrollObservationSet`,
    receipt.scrollObservationSet,
    receipt.audits,
  );
}

function validateFinalReset(
  receipt: HkVisualizationFinalResetReceipt,
  cell: HkVisualizationStateCellPlan,
) {
  return validateObservation(
    `cell ${cell.cellId} final reset`,
    receipt,
    cell.resetExpectedSignature,
    cell.resetExpectedDescriptorHash,
  );
}

function validateCellReceiptRanges(
  cell: HkVisualizationStateCellPlan,
  receipts: readonly HkVisualizationStateChunkReceipt[],
) {
  let cursor = 0;
  for (const receipt of receipts) {
    requireNonNegativeSafeInteger(
      `receipt ${receipt.chunkId}.start`,
      receipt.start,
    );
    requireNonNegativeSafeInteger(
      `receipt ${receipt.chunkId}.end`,
      receipt.end,
    );
    if (receipt.end <= receipt.start)
      contractError(`cell ${cell.cellId} contains an empty or reversed chunk.`);
    if (
      receipt.end - receipt.start >
      HK_VISUALIZATION_STATE_CHUNK_MAXIMUM_SIZE
    ) {
      contractError(
        `cell ${cell.cellId} contains a chunk larger than ${HK_VISUALIZATION_STATE_CHUNK_MAXIMUM_SIZE}.`,
      );
    }
    if (receipt.start > cursor)
      contractError(`cell ${cell.cellId} contains a chunk gap.`);
    if (receipt.start < cursor)
      contractError(
        `cell ${cell.cellId} contains a chunk overlap or is out of order.`,
      );
    cursor = receipt.end;
  }
  if (cursor !== cell.states.length)
    contractError(
      `cell ${cell.cellId} chunks do not cover its exact state plan.`,
    );
}

/**
 * Fail-closed aggregate: it either returns exact zero-failure evidence or throws.
 * This is a pure contract for a later browser-helper integration; it does not
 * itself execute or certify the live visualization matrix.
 */
export function validateHkVisualizationStateChunkReceipts(
  input: HkVisualizationStateChunkAggregateInput,
): HkVisualizationZeroFailureAggregateEvidence {
  const runId = requireNonEmpty("runId", input.runId);
  const buildId = requireNonEmpty("buildId", input.buildId);
  const auditHash = requireHash("auditHash", input.auditHash);
  const buildHash = requireHash("buildHash", input.buildHash);
  const matrixManifestHash = requireHash(
    "matrixManifestHash",
    input.matrixManifestHash,
  );
  const runHash = requireHash("runHash", input.runHash);
  if (!Array.isArray(input.expectedCells) || input.expectedCells.length === 0) {
    contractError(
      "expectedCells must contain the caller-supplied exact cell manifest.",
    );
  }
  if (!Array.isArray(input.receipts))
    contractError("receipts must be an array.");

  const seenCellIds = new Set<string>();
  for (const cell of input.expectedCells) {
    if (seenCellIds.has(cell.cellId))
      contractError(`expected cell ${cell.cellId} is duplicated.`);
    seenCellIds.add(cell.cellId);
    validateExpectedCellPlan(cell);
  }
  const expectedMatrixManifestHash = hashHkVisualizationMatrixManifest(
    input.expectedCells,
  );
  if (matrixManifestHash !== expectedMatrixManifestHash) {
    contractError(
      "matrixManifestHash does not bind the exact expected cell manifest.",
    );
  }
  const expectedRunHash = deriveHkVisualizationRunHash({
    auditHash,
    buildHash,
    buildId,
    matrixManifestHash,
    runId,
  });
  if (runHash !== expectedRunHash) {
    contractError("runHash does not match its build/matrix/audit/run binding.");
  }

  const expectedChunks = input.expectedCells.flatMap((cell) => cell.chunks);
  const expectedCellIds = new Set(
    input.expectedCells.map(({ cellId }) => cellId),
  );
  const actualCellIds = new Set(input.receipts.map(({ cellId }) => cellId));
  for (const cellId of actualCellIds) {
    if (!expectedCellIds.has(cellId))
      contractError(`receipt contains extra cell ${cellId}.`);
  }
  for (const cellId of expectedCellIds) {
    if (!actualCellIds.has(cellId))
      contractError(`receipt is missing expected cell ${cellId}.`);
  }
  const seenChunkIds = new Set<string>();
  for (const receipt of input.receipts) {
    if (seenChunkIds.has(receipt.chunkId))
      contractError(`receipt chunk ${receipt.chunkId} is duplicated.`);
    seenChunkIds.add(receipt.chunkId);
  }
  if (input.receipts.length < expectedChunks.length)
    contractError("receipt set is missing an expected chunk.");
  if (input.receipts.length > expectedChunks.length)
    contractError("receipt set contains an extra chunk.");

  for (const cell of input.expectedCells) {
    validateCellReceiptRanges(
      cell,
      input.receipts.filter(({ cellId }) => cellId === cell.cellId),
    );
  }

  let stateCount = 0;
  let nonRangeActionCount = 0;
  let finalResetCount = 0;
  const scrollObservationSets: HkVisualizationScrollObservationSet[] = [];
  for (
    let chunkIndex = 0;
    chunkIndex < expectedChunks.length;
    chunkIndex += 1
  ) {
    const expectedChunk = expectedChunks[chunkIndex];
    const receipt = input.receipts[chunkIndex];
    if (
      receipt.cellId !== expectedChunk.cellId ||
      receipt.chunkId !== expectedChunk.chunkId
    ) {
      contractError(
        `receipt chunk at aggregate index ${chunkIndex} is extra, missing, or out of order.`,
      );
    }
    const cell = input.expectedCells.find(
      ({ cellId }) => cellId === expectedChunk.cellId,
    );
    if (!cell)
      contractError(`receipt references unknown cell ${expectedChunk.cellId}.`);
    if (receipt.runId !== runId)
      contractError(`receipt ${receipt.chunkId} has the wrong runId.`);
    if (receipt.buildId !== buildId)
      contractError(`receipt ${receipt.chunkId} has the wrong buildId.`);
    requireHash(`receipt ${receipt.chunkId}.buildHash`, receipt.buildHash);
    requireHash(`receipt ${receipt.chunkId}.runHash`, receipt.runHash);
    requireHash(
      `receipt ${receipt.chunkId}.matrixManifestHash`,
      receipt.matrixManifestHash,
    );
    if (receipt.buildHash !== buildHash)
      contractError(`receipt ${receipt.chunkId} has the wrong buildHash.`);
    if (receipt.runHash !== runHash)
      contractError(`receipt ${receipt.chunkId} has the wrong runHash.`);
    if (receipt.matrixManifestHash !== matrixManifestHash) {
      contractError(
        `receipt ${receipt.chunkId} has the wrong matrixManifestHash.`,
      );
    }
    if (receipt.auditHash !== auditHash)
      contractError(`receipt ${receipt.chunkId} has the wrong auditHash.`);
    if (receipt.planHash !== expectedChunk.planHash)
      contractError(`receipt ${receipt.chunkId} has the wrong planHash.`);
    if (receipt.cellExecutionHash !== expectedChunk.cellExecutionHash) {
      contractError(
        `receipt ${receipt.chunkId} has the wrong cellExecutionHash.`,
      );
    }
    if (
      receipt.start !== expectedChunk.start ||
      receipt.end !== expectedChunk.end
    ) {
      contractError(
        `receipt ${receipt.chunkId} has the wrong exact [start,end) range.`,
      );
    }
    if (receipt.status !== "passed")
      contractError(`receipt ${receipt.chunkId} did not pass.`);
    if (receipt.failure !== null)
      contractError(`receipt ${receipt.chunkId} contains a failure.`);
    if (receipt.retryCount !== 0)
      contractError(`receipt ${receipt.chunkId} contains a retry.`);
    const expectedStates = cell.states.slice(
      expectedChunk.start,
      expectedChunk.end,
    );
    if (receipt.stateReceipts.length < expectedStates.length) {
      contractError(`receipt ${receipt.chunkId} is missing a state receipt.`);
    }
    if (receipt.stateReceipts.length > expectedStates.length) {
      contractError(
        `receipt ${receipt.chunkId} contains an extra state receipt.`,
      );
    }
    const localStateIds = new Set<string>();
    for (let index = 0; index < receipt.stateReceipts.length; index += 1) {
      const stateReceipt = receipt.stateReceipts[index];
      if (localStateIds.has(stateReceipt.stateId)) {
        contractError(
          `receipt ${receipt.chunkId} contains duplicate state ${stateReceipt.stateId}.`,
        );
      }
      localStateIds.add(stateReceipt.stateId);
      scrollObservationSets.push(validateStateReceipt(
        stateReceipt,
        expectedStates[index],
        `receipt ${receipt.chunkId} state ${expectedStates[index].id}`,
      ));
      stateCount += 1;
    }
    if (!Array.isArray(receipt.nonRangeActionReceipts)) {
      contractError(
        `receipt ${receipt.chunkId} nonRangeActionReceipts must be an array.`,
      );
    }
    const expectedNonRangeActions = expectedChunk.nonRangeActions;
    if (
      receipt.nonRangeActionReceipts.length < expectedNonRangeActions.length
    ) {
      contractError(
        `receipt ${receipt.chunkId} is missing a non-range action receipt.`,
      );
    }
    if (
      receipt.nonRangeActionReceipts.length > expectedNonRangeActions.length
    ) {
      contractError(
        `receipt ${receipt.chunkId} contains an extra non-range action receipt.`,
      );
    }
    const localNonRangeActionIds = new Set<string>();
    for (
      let index = 0;
      index < receipt.nonRangeActionReceipts.length;
      index += 1
    ) {
      const actionReceipt = receipt.nonRangeActionReceipts[index];
      if (localNonRangeActionIds.has(actionReceipt.actionId)) {
        contractError(
          `receipt ${receipt.chunkId} contains duplicate non-range action ${actionReceipt.actionId}.`,
        );
      }
      localNonRangeActionIds.add(actionReceipt.actionId);
      scrollObservationSets.push(validateNonRangeActionReceipt(
        actionReceipt,
        expectedNonRangeActions[index],
        `receipt ${receipt.chunkId} non-range action ${expectedNonRangeActions[index].actionId}`,
      ));
      nonRangeActionCount += 1;
    }
    const isFinalChunkForCell = expectedChunk.end === cell.states.length;
    if (isFinalChunkForCell) {
      if (!receipt.finalReset)
        contractError(
          `cell ${cell.cellId} is missing its final reset receipt.`,
        );
      scrollObservationSets.push(validateFinalReset(receipt.finalReset, cell));
      finalResetCount += 1;
    } else if (receipt.finalReset !== null) {
      contractError(
        `cell ${cell.cellId} has a premature or duplicate final reset receipt.`,
      );
    }
  }

  if (
    stateCount !==
    input.expectedCells.reduce((sum, cell) => sum + cell.states.length, 0)
  ) {
    contractError(
      "aggregate state count differs from the exact preflight plan.",
    );
  }
  if (finalResetCount !== input.expectedCells.length) {
    contractError(
      "aggregate final reset count differs from the exact expected cell count.",
    );
  }
  const expectedNonRangeActionCount = input.expectedCells.reduce(
    (sum, cell) => sum + cell.nonRangeActions.length,
    0,
  );
  if (nonRangeActionCount !== expectedNonRangeActionCount) {
    contractError(
      "aggregate non-range action count differs from the exact preflight plan and receipts.",
    );
  }

  const planSetHash = sha256HkVisualizationCanonical(input.expectedCells);
  const receiptSetHash = sha256HkVisualizationCanonical(input.receipts);
  const executionUnitCount = stateCount + nonRangeActionCount + finalResetCount;
  if (scrollObservationSets.length !== executionUnitCount) {
    contractError(
      "scroll observation set count differs from exact state/action/reset execution units.",
    );
  }
  const scrollContainerCount = scrollObservationSets.reduce(
    (sum, set) => addSafe("aggregate scroll container count", sum, set.containerCount),
    0,
  );
  const scrollObservationCount = scrollObservationSets.reduce(
    (sum, set) => addSafe("aggregate scroll observation count", sum, set.observationCount),
    0,
  );
  const scrollPositionAuditCount = multiplySafe(
    "aggregate scroll-position audit count",
    scrollObservationCount,
    HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS.length,
  );
  const auditedExecutionMs = scrollObservationSets.reduce(
    (sum, set) =>
      addSafe(
        "aggregate audited execution time",
        sum,
        calculateHkVisualizationAuditedExecutionMs(set.observationCount),
      ),
    0,
  );
  const scrollObservationAggregateHash = sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
    kind: "ordered-scroll-observation-sets",
    sets: scrollObservationSets,
  });
  const evidenceWithoutHash = {
    auditedExecutionMs,
    auditHash,
    buildHash,
    buildId,
    cellCount: input.expectedCells.length,
    chunkCount: input.receipts.length,
    failureCount: 0 as const,
    finalResetCount,
    mandatoryAuditCount: executionUnitCount + scrollPositionAuditCount,
    matrixManifestHash,
    nonRangeActionCount,
    planSetHash,
    receiptSetHash,
    retryCount: 0 as const,
    runHash,
    runId,
    skippedCount: 0 as const,
    scrollContainerCount,
    scrollObservationAggregateHash,
    scrollObservationCount,
    scrollObservationSetCount: scrollObservationSets.length,
    scrollPositionAuditCount,
    stateCount,
    status: "passed" as const,
    totalProvisionalBudgetMs: input.expectedCells.reduce(
      (sum, cell) =>
        requireSafeTotal(
          "aggregate provisional budget",
          sum + cell.budget.totalMs,
        ),
      0,
    ),
    zeroFailures: true as const,
  };
  return Object.freeze({
    ...evidenceWithoutHash,
    aggregateHash: sha256HkVisualizationCanonical({
      contractVersion: HK_VISUALIZATION_STATE_CHUNK_CONTRACT_VERSION,
      evidence: evidenceWithoutHash,
      kind: "zero-failure-aggregate",
    }),
  });
}
