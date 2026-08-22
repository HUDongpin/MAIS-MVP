import {
  HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS,
  canonicalHkVisualizationJson,
  hashHkVisualizationAuditEvidence,
  sha256HkVisualizationCanonical,
  type HkVisualizationCanonicalEvidence,
  type HkVisualizationMandatoryAuditReceipt,
  type HkVisualizationMandatoryAuditReceiptSet,
  type HkVisualizationMandatoryStateAuditId,
} from "./hk-visualization-state-chunk-contract";

export const HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION =
  "hk-viz-positive-state-audit.v1" as const;

const HASH_PATTERN = /^[a-f0-9]{64}$/;
const COLLISION_PAIR_KINDS = Object.freeze([
  "control-control",
  "dom-text-text",
  "svg-label-label",
  "svg-label-mark",
  "text-control",
  "text-occlusion",
] as const);

type HkVisualizationCollisionPairKind = (typeof COLLISION_PAIR_KINDS)[number];

export type HkVisualizationPositiveAuditScalar =
  boolean | number | string | null;

export type HkVisualizationPositiveAuditBinding = Readonly<{
  cellId: string;
  contractVersion: typeof HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION;
  domainId: string | null;
  expectedDescriptorHash: string;
  expectedSignatureHash: string;
  labId: string;
  modeContextHash: string;
  modeId: string;
  moduleId: "configured-visualization-lab";
  observedDescriptorHash: string;
  observedSignatureHash: string;
  phase: string;
  projectedAbsenceSetHash: string;
  rehydrationActionsHash: string;
  stateId: string;
  stateIndex: number;
  topicId: string;
}>;

export type HkVisualizationProjectedControlEvidence = Readonly<{
  controlId: string;
  controllerActionId: string;
  controllerActionIndex: number;
  disposition: "projected-fixed";
  expectedFixedValue: HkVisualizationPositiveAuditScalar;
  fixedNodeCount: 1;
  fixedNodeInteractive: false;
  fixedNodeLearnerVisible: true;
  fixedNodeSelector: string;
  fixedNodeTabbable: false;
  interactiveCount: 0;
  interactiveSelector: string;
  observedFixedValue: HkVisualizationPositiveAuditScalar;
  projection: "clamp-and-visibility";
  reason: string;
  rehydrationActionsHash: string;
  serializedStateValue: HkVisualizationPositiveAuditScalar;
}>;

export type HkVisualizationMathAuditEvidence = Readonly<{
  activeModeEvidence: Readonly<{
    activeSelector: string | null;
    exactMatchCount: number;
    expectedModeId: string;
    observedModeId: string;
  }>;
  allowedExtraStateKeys: readonly string[];
  auditCompleted: true;
  binding: HkVisualizationPositiveAuditBinding;
  canonicalState: HkVisualizationCanonicalEvidence;
  checks: readonly Readonly<{
    absoluteTolerance: number | null;
    checkId: string;
    independentlyComputedExpected: HkVisualizationCanonicalEvidence;
    kind:
      | "absolute-tolerance"
      | "exact"
      | "geometric-invariant"
      | "integer-exact"
      | "ordered-sequence"
      | "relative-tolerance"
      | "set-equality";
    observed: HkVisualizationCanonicalEvidence;
    operands: HkVisualizationCanonicalEvidence;
    passed: true;
    relativeTolerance: number | null;
  }>[];
  evaluatorFamily: string;
  formulaEvidence: readonly Readonly<{
    formulaId: string;
    normalizedValue: string;
    selector: string;
  }>[];
  marks: readonly Readonly<{
    attributes: Readonly<Record<string, HkVisualizationPositiveAuditScalar>>;
    exactCount: number;
    expectedCount: number;
    markId: string;
    selector: string;
    visibleCount: number;
  }>[];
  observedStateKeys: readonly string[];
  oracleId: string;
  oracleSource: "independent-test-oracle";
  oracleVersion: string;
  projectedAbsenceSetHash: string;
  projectedAbsences: readonly HkVisualizationProjectedControlEvidence[];
  requiredStateKeys: readonly string[];
  scannerException: null;
}>;

export type HkVisualizationLayoutAuditEvidence = Readonly<{
  auditCompleted: true;
  binding: HkVisualizationPositiveAuditBinding;
  clippedCandidateCount: 0;
  document: Readonly<{
    clientWidth: number;
    overflowPx: number;
    scrollWidth: number;
  }>;
  educationalScrollContainers: readonly Readonly<{
    clientWidth: number;
    focusable: true;
    key: string;
    learnerVisible: true;
    maximumScrollLeft: number;
    panHintKind: "explicit-attribute" | "localized-nearby-text";
    reachedEnd: true;
    reachedScrollLeft: number;
    scrollWidth: number;
  }>[];
  inspectedCandidateCount: number;
  issueCount: 0;
  learnerVisibleCandidateCount: number;
  scannerException: null;
  tolerancePx: 2;
  workspace: Readonly<{
    clientWidth: number;
    overflowPx: number;
    overflowX: string;
    scrollWidth: number;
  }>;
}>;

export type HkVisualizationCollisionAuditEvidence = Readonly<{
  auditCompleted: true;
  binding: HkVisualizationPositiveAuditBinding;
  canvasSurfaceCount: 0;
  inspected: Readonly<{
    candidatePairCounts: Readonly<
      Record<HkVisualizationCollisionPairKind, number>
    >;
    htmlTextFragmentCount: number;
    learnerControlCount: number;
    paintedMarkCount: number;
    svgTextFragmentCount: number;
  }>;
  issueCount: 0;
  maximumRecordedIssues: 100;
  overlapExemptions: readonly Readonly<{
    areaRatio: number;
    candidateCount: 2;
    heightRatio: number;
    owner: string;
    pair: readonly [string, string];
    reason: string;
    risk: "explicit-narrow-pair";
    scope: "html-wrapper" | "self" | "svg-group";
    widthRatio: number;
  }>[];
  scannerException: null;
  svgSurfaceCount: number;
  tolerancePx: 4;
  truncated: false;
}>;

export type HkVisualizationContrastTargetEvidence = Readonly<{
  background: string;
  backgroundLuminance: number;
  contrastRatio: number;
  effectiveOpacity: number;
  foreground: string;
  requiredRatio: number;
  target: string;
  targetKey: string;
}>;

export type HkVisualizationContrastAuditEvidence = Readonly<{
  auditCompleted: true;
  binding: HkVisualizationPositiveAuditBinding;
  checkedTextCount: number;
  evidenceCount: number;
  issueCount: 0;
  normalizedTargetEvidenceHash: string;
  scannerException: null;
  targets: readonly HkVisualizationContrastTargetEvidence[];
  worst: HkVisualizationContrastTargetEvidence;
}>;

export type HkVisualizationInteractiveControlEvidence = Readonly<{
  ariaDisabled: false;
  controlKey: string;
  declaredControlId: string | null;
  disabled: false;
  interactive: true;
  learnerExposed: true;
  pointerEventsNone: false;
  role: string | null;
  tag: string;
  visuallyVisible: true;
}>;

export type HkVisualizationControlVisibilityAuditEvidence = Readonly<{
  auditCompleted: true;
  binding: HkVisualizationPositiveAuditBinding;
  declaredStateControlCount: number;
  disabledOrAriaDisabledCount: 0;
  interactiveControlKeysHash: string;
  interactiveControls: readonly HkVisualizationInteractiveControlEvidence[];
  invisibleTabbableCount: 0;
  nonLearnerExposedCount: 0;
  observedInteractiveControlCount: number;
  projectedAbsenceSetHash: string;
  projectedFixedControlCount: number;
  projectedFixedControls: readonly HkVisualizationProjectedControlEvidence[];
  scannerException: null;
}>;

export type HkVisualizationTarget44ControlEvidence = Readonly<{
  controlKey: string;
  explicitPointerTarget: boolean;
  minimum44: true;
  ownHeight: number;
  ownWidth: number;
  pointerScopeIssueCount: 0;
  targetHeight: number;
  targetPolicy: "associated-label" | "self";
  targetWidth: number;
}>;

export type HkVisualizationTarget44AuditEvidence = Readonly<{
  auditCompleted: true;
  auditedControlCount: number;
  auditedControlKeysHash: string;
  binding: HkVisualizationPositiveAuditBinding;
  controls: readonly HkVisualizationTarget44ControlEvidence[];
  excludedProjectedFixedControlKeys: readonly string[];
  minimumObserved: Readonly<{
    controlKey: string;
    height: number;
    width: number;
  }>;
  projectedAbsenceSetHash: string;
  scannerException: null;
}>;

export type HkVisualizationHitTargetControlEvidence = Readonly<{
  acceptedHitPolicy: "own-centre" | "validated-associated-target-centre";
  centreX: number;
  centreY: number;
  controlKey: string;
  effectiveTargetCentreHit: boolean;
  ownCentreHit: boolean;
  passed: true;
  topHitKey: string;
}>;

export type HkVisualizationHitTargetAuditEvidence = Readonly<{
  auditCompleted: true;
  auditedControlCount: number;
  auditedControlKeysHash: string;
  binding: HkVisualizationPositiveAuditBinding;
  controls: readonly HkVisualizationHitTargetControlEvidence[];
  excludedProjectedFixedControlKeys: readonly string[];
  projectedAbsenceSetHash: string;
  scannerException: null;
}>;

export type HkVisualizationPositiveAuditEvidenceById = Readonly<{
  collision: HkVisualizationCollisionAuditEvidence;
  contrast: HkVisualizationContrastAuditEvidence;
  controlVisibility: HkVisualizationControlVisibilityAuditEvidence;
  hitTarget: HkVisualizationHitTargetAuditEvidence;
  layout: HkVisualizationLayoutAuditEvidence;
  math: HkVisualizationMathAuditEvidence;
  target44: HkVisualizationTarget44AuditEvidence;
}>;

export type HkVisualizationPositiveAuditValidationEvidence = Readonly<{
  auditEvidenceHashes: Readonly<
    Record<HkVisualizationMandatoryStateAuditId, string>
  >;
  bindingHash: string;
  contractVersion: typeof HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION;
  interactiveControlKeysHash: string;
  projectedAbsenceSetHash: string;
  receiptSetHash: string;
  status: "passed";
}>;

type JsonRecord = Record<string, unknown>;

function contractError(message: string): never {
  throw new Error(`HK positive audit contract: ${message}`);
}

function exactRecord(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    contractError(`${label} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    contractError(`${label} must be a plain JSON object.`);
  }
  return value as JsonRecord;
}

function exactKeys(
  record: JsonRecord,
  expected: readonly string[],
  label: string,
) {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (
    canonicalHkVisualizationJson(actual) !==
    canonicalHkVisualizationJson(wanted)
  ) {
    contractError(
      `${label} has extra or missing keys; expected ${JSON.stringify(wanted)}, observed ${JSON.stringify(actual)}.`,
    );
  }
}

function exactArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) contractError(`${label} must be an array.`);
  return value;
}

function nonBlank(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    contractError(`${label} must be a nonblank string.`);
  }
  return value;
}

function nullableNonBlank(value: unknown, label: string): string | null {
  return value === null ? null : nonBlank(value, label);
}

function exactLiteral<T extends boolean | number | string | null>(
  value: unknown,
  expected: T,
  label: string,
): T {
  if (!Object.is(value, expected)) {
    contractError(`${label} must equal ${JSON.stringify(expected)}.`);
  }
  return expected;
}

function finiteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    contractError(`${label} must be finite.`);
  }
  return value;
}

function nonNegativeInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    contractError(`${label} must be a non-negative safe integer.`);
  }
  return value as number;
}

function positiveInteger(value: unknown, label: string): number {
  const result = nonNegativeInteger(value, label);
  if (result === 0) contractError(`${label} must be positive.`);
  return result;
}

function exactHash(value: unknown, label: string): string {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    contractError(`${label} must be a lowercase SHA-256 hash.`);
  }
  return value;
}

function canonicalEqual(left: unknown, right: unknown) {
  return (
    canonicalHkVisualizationJson(left) === canonicalHkVisualizationJson(right)
  );
}

function compareCanonicalStrings(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function exactSortedUniqueStrings(value: unknown, label: string): string[] {
  const items = exactArray(value, label).map((item, index) =>
    nonBlank(item, `${label}[${index}]`),
  );
  const expected = [...new Set(items)].sort(compareCanonicalStrings);
  if (!canonicalEqual(items, expected)) {
    contractError(`${label} must be unique and sorted.`);
  }
  return items;
}

function canonicalScalar(
  value: unknown,
  label: string,
): HkVisualizationPositiveAuditScalar {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return Object.is(value, -0) ? 0 : value;
  }
  contractError(`${label} must be a canonical JSON scalar.`);
}

function canonicalEvidence(
  value: unknown,
  label: string,
): HkVisualizationCanonicalEvidence {
  try {
    canonicalHkVisualizationJson(value);
  } catch (error) {
    contractError(
      `${label} is not canonical JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return value as HkVisualizationCanonicalEvidence;
}

function evidenceIsEmpty(value: HkVisualizationCanonicalEvidence): boolean {
  if (value === null) return true;
  if (typeof value === "string") return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value).length === 0;
  return false;
}

export function hashHkVisualizationPositiveAuditBinding(
  binding: HkVisualizationPositiveAuditBinding,
) {
  return sha256HkVisualizationCanonical({
    binding,
    contractVersion: HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
    kind: "positive-audit-binding",
  });
}

export function hashHkVisualizationInteractiveControlKeys(
  controlKeys: readonly string[],
) {
  const keys = exactSortedUniqueStrings(
    controlKeys,
    "interactive control keys",
  );
  return sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
    controlKeys: keys,
    kind: "interactive-control-keys",
  });
}

export function hashHkVisualizationProjectedAbsenceSet(
  projectedAbsences: readonly HkVisualizationProjectedControlEvidence[],
) {
  const ids = projectedAbsences.map(({ controlId }) => controlId);
  exactSortedUniqueStrings(ids, "projected absence control IDs");
  return sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
    kind: "projected-absence-set",
    projectedAbsences,
  });
}

export function hashHkVisualizationContrastTargetEvidence(
  targets: readonly HkVisualizationContrastTargetEvidence[],
) {
  exactSortedUniqueStrings(
    targets.map(({ targetKey }) => targetKey),
    "contrast target keys",
  );
  return sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
    kind: "contrast-target-evidence",
    targets,
  });
}

export function hashHkVisualizationPositiveAuditReceiptSet(
  receipts: HkVisualizationMandatoryAuditReceiptSet,
) {
  return sha256HkVisualizationCanonical({
    contractVersion: HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
    kind: "positive-audit-receipt-set",
    receipts,
  });
}

export function buildHkVisualizationPositiveAuditReceipt<
  AuditId extends HkVisualizationMandatoryStateAuditId,
>(
  auditId: AuditId,
  evidence: HkVisualizationPositiveAuditEvidenceById[AuditId],
): HkVisualizationMandatoryAuditReceipt {
  const canonical = evidence as unknown as HkVisualizationCanonicalEvidence;
  return Object.freeze({
    auditId,
    evidence: canonical,
    evidenceHash: hashHkVisualizationAuditEvidence(auditId, canonical),
    failure: null,
    issues: Object.freeze([]),
    retryCount: 0,
    status: "passed",
  });
}

function validateBindingShape(
  raw: unknown,
  label: string,
): HkVisualizationPositiveAuditBinding {
  const binding = exactRecord(raw, label);
  exactKeys(
    binding,
    [
      "cellId",
      "contractVersion",
      "domainId",
      "expectedDescriptorHash",
      "expectedSignatureHash",
      "labId",
      "modeContextHash",
      "modeId",
      "moduleId",
      "observedDescriptorHash",
      "observedSignatureHash",
      "phase",
      "projectedAbsenceSetHash",
      "rehydrationActionsHash",
      "stateId",
      "stateIndex",
      "topicId",
    ],
    label,
  );
  exactLiteral(
    binding.contractVersion,
    HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
    `${label}.contractVersion`,
  );
  nonBlank(binding.cellId, `${label}.cellId`);
  nullableNonBlank(binding.domainId, `${label}.domainId`);
  const expectedDescriptorHash = exactHash(
    binding.expectedDescriptorHash,
    `${label}.expectedDescriptorHash`,
  );
  const observedDescriptorHash = exactHash(
    binding.observedDescriptorHash,
    `${label}.observedDescriptorHash`,
  );
  const expectedSignatureHash = exactHash(
    binding.expectedSignatureHash,
    `${label}.expectedSignatureHash`,
  );
  const observedSignatureHash = exactHash(
    binding.observedSignatureHash,
    `${label}.observedSignatureHash`,
  );
  if (expectedDescriptorHash !== observedDescriptorHash) {
    contractError(`${label} expected and observed descriptor hashes differ.`);
  }
  if (expectedSignatureHash !== observedSignatureHash) {
    contractError(`${label} expected and observed signature hashes differ.`);
  }
  const labId = nonBlank(binding.labId, `${label}.labId`);
  const topicId = nonBlank(binding.topicId, `${label}.topicId`);
  if (labId !== topicId) contractError(`${label} labId and topicId differ.`);
  nonBlank(binding.modeId, `${label}.modeId`);
  nonBlank(binding.phase, `${label}.phase`);
  nonBlank(binding.stateId, `${label}.stateId`);
  nonNegativeInteger(binding.stateIndex, `${label}.stateIndex`);
  exactLiteral(
    binding.moduleId,
    "configured-visualization-lab",
    `${label}.moduleId`,
  );
  exactHash(binding.modeContextHash, `${label}.modeContextHash`);
  exactHash(
    binding.projectedAbsenceSetHash,
    `${label}.projectedAbsenceSetHash`,
  );
  exactHash(binding.rehydrationActionsHash, `${label}.rehydrationActionsHash`);
  return binding as HkVisualizationPositiveAuditBinding;
}

function validateExactBinding(
  raw: unknown,
  expected: HkVisualizationPositiveAuditBinding,
  label: string,
) {
  const binding = validateBindingShape(raw, label);
  if (!canonicalEqual(binding, expected)) {
    contractError(`${label} does not equal the expected exact state binding.`);
  }
  return binding;
}

function validateProjectedAbsences(
  raw: unknown,
  binding: HkVisualizationPositiveAuditBinding,
  label: string,
) {
  const items = exactArray(raw, label);
  const validated = items.map((item, index) => {
    const entryLabel = `${label}[${index}]`;
    const entry = exactRecord(item, entryLabel);
    exactKeys(
      entry,
      [
        "controlId",
        "controllerActionId",
        "controllerActionIndex",
        "disposition",
        "expectedFixedValue",
        "fixedNodeCount",
        "fixedNodeInteractive",
        "fixedNodeLearnerVisible",
        "fixedNodeSelector",
        "fixedNodeTabbable",
        "interactiveCount",
        "interactiveSelector",
        "observedFixedValue",
        "projection",
        "reason",
        "rehydrationActionsHash",
        "serializedStateValue",
      ],
      entryLabel,
    );
    nonBlank(entry.controlId, `${entryLabel}.controlId`);
    nonBlank(entry.controllerActionId, `${entryLabel}.controllerActionId`);
    nonNegativeInteger(
      entry.controllerActionIndex,
      `${entryLabel}.controllerActionIndex`,
    );
    exactLiteral(
      entry.disposition,
      "projected-fixed",
      `${entryLabel}.disposition`,
    );
    const expectedValue = canonicalScalar(
      entry.expectedFixedValue,
      `${entryLabel}.expectedFixedValue`,
    );
    const observedValue = canonicalScalar(
      entry.observedFixedValue,
      `${entryLabel}.observedFixedValue`,
    );
    const serializedValue = canonicalScalar(
      entry.serializedStateValue,
      `${entryLabel}.serializedStateValue`,
    );
    if (
      !canonicalEqual(expectedValue, observedValue) ||
      !canonicalEqual(expectedValue, serializedValue)
    ) {
      contractError(
        `${entryLabel} expected, observed, and serialized fixed values differ.`,
      );
    }
    exactLiteral(entry.fixedNodeCount, 1, `${entryLabel}.fixedNodeCount`);
    exactLiteral(
      entry.fixedNodeInteractive,
      false,
      `${entryLabel}.fixedNodeInteractive`,
    );
    exactLiteral(
      entry.fixedNodeLearnerVisible,
      true,
      `${entryLabel}.fixedNodeLearnerVisible`,
    );
    exactLiteral(
      entry.fixedNodeTabbable,
      false,
      `${entryLabel}.fixedNodeTabbable`,
    );
    exactLiteral(entry.interactiveCount, 0, `${entryLabel}.interactiveCount`);
    nonBlank(entry.fixedNodeSelector, `${entryLabel}.fixedNodeSelector`);
    nonBlank(entry.interactiveSelector, `${entryLabel}.interactiveSelector`);
    exactLiteral(
      entry.projection,
      "clamp-and-visibility",
      `${entryLabel}.projection`,
    );
    nonBlank(entry.reason, `${entryLabel}.reason`);
    const rehydrationActionsHash = exactHash(
      entry.rehydrationActionsHash,
      `${entryLabel}.rehydrationActionsHash`,
    );
    if (rehydrationActionsHash !== binding.rehydrationActionsHash) {
      contractError(`${entryLabel} has the wrong rehydration actions hash.`);
    }
    return entry as unknown as HkVisualizationProjectedControlEvidence;
  });
  exactSortedUniqueStrings(
    validated.map(({ controlId }) => controlId),
    `${label} control IDs`,
  );
  const hash = hashHkVisualizationProjectedAbsenceSet(validated);
  if (hash !== binding.projectedAbsenceSetHash) {
    contractError(`${label} does not match the binding projection hash.`);
  }
  return validated;
}

function validateAuditPreamble(
  evidence: JsonRecord,
  expectedBinding: HkVisualizationPositiveAuditBinding,
  label: string,
) {
  exactLiteral(evidence.auditCompleted, true, `${label}.auditCompleted`);
  exactLiteral(evidence.scannerException, null, `${label}.scannerException`);
  return validateExactBinding(
    evidence.binding,
    expectedBinding,
    `${label}.binding`,
  );
}

function validateMathEvidence(
  raw: unknown,
  expectedBinding: HkVisualizationPositiveAuditBinding,
) {
  const label = "math evidence";
  const evidence = exactRecord(raw, label);
  exactKeys(
    evidence,
    [
      "activeModeEvidence",
      "allowedExtraStateKeys",
      "auditCompleted",
      "binding",
      "canonicalState",
      "checks",
      "evaluatorFamily",
      "formulaEvidence",
      "marks",
      "observedStateKeys",
      "oracleId",
      "oracleSource",
      "oracleVersion",
      "projectedAbsenceSetHash",
      "projectedAbsences",
      "requiredStateKeys",
      "scannerException",
    ],
    label,
  );
  const binding = validateAuditPreamble(evidence, expectedBinding, label);
  const oracleId = nonBlank(evidence.oracleId, `${label}.oracleId`);
  if (!oracleId.startsWith(`${binding.topicId}.`)) {
    contractError(`${label}.oracleId is not topic-specific.`);
  }
  nonBlank(evidence.oracleVersion, `${label}.oracleVersion`);
  nonBlank(evidence.evaluatorFamily, `${label}.evaluatorFamily`);
  exactLiteral(
    evidence.oracleSource,
    "independent-test-oracle",
    `${label}.oracleSource`,
  );
  const requiredStateKeys = exactSortedUniqueStrings(
    evidence.requiredStateKeys,
    `${label}.requiredStateKeys`,
  );
  if (requiredStateKeys.length === 0) {
    contractError(`${label}.requiredStateKeys cannot be empty.`);
  }
  const allowedExtraStateKeys = exactSortedUniqueStrings(
    evidence.allowedExtraStateKeys,
    `${label}.allowedExtraStateKeys`,
  );
  const observedStateKeys = exactSortedUniqueStrings(
    evidence.observedStateKeys,
    `${label}.observedStateKeys`,
  );
  for (const required of requiredStateKeys) {
    if (!observedStateKeys.includes(required)) {
      contractError(`${label} omitted required state key ${required}.`);
    }
  }
  const allowed = new Set([...requiredStateKeys, ...allowedExtraStateKeys]);
  const unknownKeys = observedStateKeys.filter((key) => !allowed.has(key));
  if (unknownKeys.length > 0) {
    contractError(
      `${label} contains unapproved state keys ${JSON.stringify(unknownKeys)}.`,
    );
  }
  const canonicalState = canonicalEvidence(
    evidence.canonicalState,
    `${label}.canonicalState`,
  );
  const stateRecord = exactRecord(canonicalState, `${label}.canonicalState`);
  if (!canonicalEqual(Object.keys(stateRecord).sort(), observedStateKeys)) {
    contractError(
      `${label}.canonicalState keys do not equal observedStateKeys.`,
    );
  }
  const active = exactRecord(
    evidence.activeModeEvidence,
    `${label}.activeModeEvidence`,
  );
  exactKeys(
    active,
    ["activeSelector", "exactMatchCount", "expectedModeId", "observedModeId"],
    `${label}.activeModeEvidence`,
  );
  nullableNonBlank(
    active.activeSelector,
    `${label}.activeModeEvidence.activeSelector`,
  );
  exactLiteral(
    active.exactMatchCount,
    1,
    `${label}.activeModeEvidence.exactMatchCount`,
  );
  if (
    nonBlank(
      active.expectedModeId,
      `${label}.activeModeEvidence.expectedModeId`,
    ) !== binding.modeId ||
    nonBlank(
      active.observedModeId,
      `${label}.activeModeEvidence.observedModeId`,
    ) !== binding.modeId
  ) {
    contractError(`${label}.activeModeEvidence does not match the bound mode.`);
  }

  const marks = exactArray(evidence.marks, `${label}.marks`).map(
    (item, index) => {
      const itemLabel = `${label}.marks[${index}]`;
      const mark = exactRecord(item, itemLabel);
      exactKeys(
        mark,
        [
          "attributes",
          "exactCount",
          "expectedCount",
          "markId",
          "selector",
          "visibleCount",
        ],
        itemLabel,
      );
      nonBlank(mark.markId, `${itemLabel}.markId`);
      nonBlank(mark.selector, `${itemLabel}.selector`);
      const expectedCount = positiveInteger(
        mark.expectedCount,
        `${itemLabel}.expectedCount`,
      );
      if (
        nonNegativeInteger(mark.exactCount, `${itemLabel}.exactCount`) !==
          expectedCount ||
        nonNegativeInteger(mark.visibleCount, `${itemLabel}.visibleCount`) !==
          expectedCount
      ) {
        contractError(
          `${itemLabel} did not match its exact visible mark count.`,
        );
      }
      const attributes = exactRecord(
        mark.attributes,
        `${itemLabel}.attributes`,
      );
      if (Object.keys(attributes).length === 0) {
        contractError(`${itemLabel}.attributes cannot be empty.`);
      }
      for (const [key, value] of Object.entries(attributes)) {
        nonBlank(key, `${itemLabel}.attributes key`);
        canonicalScalar(value, `${itemLabel}.attributes.${key}`);
      }
      return mark;
    },
  );
  if (marks.length === 0) contractError(`${label}.marks cannot be empty.`);
  exactSortedUniqueStrings(
    marks.map((mark) => mark.markId),
    `${label}.mark IDs`,
  );

  const formulas = exactArray(
    evidence.formulaEvidence,
    `${label}.formulaEvidence`,
  ).map((item, index) => {
    const itemLabel = `${label}.formulaEvidence[${index}]`;
    const formula = exactRecord(item, itemLabel);
    exactKeys(formula, ["formulaId", "normalizedValue", "selector"], itemLabel);
    nonBlank(formula.formulaId, `${itemLabel}.formulaId`);
    nonBlank(formula.normalizedValue, `${itemLabel}.normalizedValue`);
    nonBlank(formula.selector, `${itemLabel}.selector`);
    return formula;
  });
  if (formulas.length === 0) {
    contractError(`${label}.formulaEvidence cannot be empty.`);
  }
  exactSortedUniqueStrings(
    formulas.map((formula) => formula.formulaId),
    `${label}.formula IDs`,
  );

  const supportedKinds = new Set([
    "absolute-tolerance",
    "exact",
    "geometric-invariant",
    "integer-exact",
    "ordered-sequence",
    "relative-tolerance",
    "set-equality",
  ]);
  const checks = exactArray(evidence.checks, `${label}.checks`).map(
    (item, index) => {
      const itemLabel = `${label}.checks[${index}]`;
      const check = exactRecord(item, itemLabel);
      exactKeys(
        check,
        [
          "absoluteTolerance",
          "checkId",
          "independentlyComputedExpected",
          "kind",
          "observed",
          "operands",
          "passed",
          "relativeTolerance",
        ],
        itemLabel,
      );
      nonBlank(check.checkId, `${itemLabel}.checkId`);
      const kind = nonBlank(check.kind, `${itemLabel}.kind`);
      if (!supportedKinds.has(kind))
        contractError(`${itemLabel}.kind is unsupported.`);
      exactLiteral(check.passed, true, `${itemLabel}.passed`);
      const operands = canonicalEvidence(
        check.operands,
        `${itemLabel}.operands`,
      );
      if (evidenceIsEmpty(operands))
        contractError(`${itemLabel}.operands cannot be empty.`);
      const expected = canonicalEvidence(
        check.independentlyComputedExpected,
        `${itemLabel}.independentlyComputedExpected`,
      );
      const observed = canonicalEvidence(
        check.observed,
        `${itemLabel}.observed`,
      );
      if (expected === null || observed === null) {
        contractError(
          `${itemLabel} expected and observed evidence cannot be null.`,
        );
      }
      if (kind === "absolute-tolerance" || kind === "relative-tolerance") {
        const expectedNumber = finiteNumber(expected, `${itemLabel}.expected`);
        const observedNumber = finiteNumber(observed, `${itemLabel}.observed`);
        if (kind === "absolute-tolerance") {
          const tolerance = finiteNumber(
            check.absoluteTolerance,
            `${itemLabel}.absoluteTolerance`,
          );
          if (tolerance < 0)
            contractError(`${itemLabel}.absoluteTolerance cannot be negative.`);
          exactLiteral(
            check.relativeTolerance,
            null,
            `${itemLabel}.relativeTolerance`,
          );
          if (Math.abs(expectedNumber - observedNumber) > tolerance) {
            contractError(`${itemLabel} exceeds its absolute tolerance.`);
          }
        } else {
          const tolerance = finiteNumber(
            check.relativeTolerance,
            `${itemLabel}.relativeTolerance`,
          );
          if (tolerance < 0)
            contractError(`${itemLabel}.relativeTolerance cannot be negative.`);
          exactLiteral(
            check.absoluteTolerance,
            null,
            `${itemLabel}.absoluteTolerance`,
          );
          if (
            Math.abs(expectedNumber - observedNumber) >
            tolerance * Math.max(1, Math.abs(expectedNumber))
          ) {
            contractError(`${itemLabel} exceeds its relative tolerance.`);
          }
        }
      } else {
        exactLiteral(
          check.absoluteTolerance,
          null,
          `${itemLabel}.absoluteTolerance`,
        );
        exactLiteral(
          check.relativeTolerance,
          null,
          `${itemLabel}.relativeTolerance`,
        );
        if (kind === "integer-exact") {
          if (
            !Number.isSafeInteger(expected) ||
            !Number.isSafeInteger(observed)
          ) {
            contractError(
              `${itemLabel} integer-exact values must be safe integers.`,
            );
          }
        }
        if (!canonicalEqual(expected, observed)) {
          contractError(
            `${itemLabel} independently computed and observed evidence differ.`,
          );
        }
      }
      return check;
    },
  );
  if (checks.length === 0) contractError(`${label}.checks cannot be empty.`);
  exactSortedUniqueStrings(
    checks.map((check) => check.checkId),
    `${label}.check IDs`,
  );

  const projectedAbsences = validateProjectedAbsences(
    evidence.projectedAbsences,
    binding,
    `${label}.projectedAbsences`,
  );
  const projectionHash = exactHash(
    evidence.projectedAbsenceSetHash,
    `${label}.projectedAbsenceSetHash`,
  );
  if (
    projectionHash !== binding.projectedAbsenceSetHash ||
    projectionHash !== hashHkVisualizationProjectedAbsenceSet(projectedAbsences)
  ) {
    contractError(`${label} projection hash does not reconcile.`);
  }
  return evidence as unknown as HkVisualizationMathAuditEvidence;
}

function validateDimensionRecord(
  raw: unknown,
  expectedKeys: readonly string[],
  label: string,
) {
  const record = exactRecord(raw, label);
  exactKeys(record, expectedKeys, label);
  const clientWidth = finiteNumber(record.clientWidth, `${label}.clientWidth`);
  const scrollWidth = finiteNumber(record.scrollWidth, `${label}.scrollWidth`);
  const overflowPx = finiteNumber(record.overflowPx, `${label}.overflowPx`);
  if (clientWidth < 0 || scrollWidth < 0 || overflowPx < 0) {
    contractError(`${label} dimensions cannot be negative.`);
  }
  const expectedOverflow = Math.max(0, scrollWidth - clientWidth);
  if (!Object.is(overflowPx, expectedOverflow)) {
    contractError(
      `${label}.overflowPx does not equal scrollWidth-clientWidth.`,
    );
  }
  return { clientWidth, overflowPx, record, scrollWidth };
}

function validateLayoutEvidence(
  raw: unknown,
  expectedBinding: HkVisualizationPositiveAuditBinding,
) {
  const label = "layout evidence";
  const evidence = exactRecord(raw, label);
  exactKeys(
    evidence,
    [
      "auditCompleted",
      "binding",
      "clippedCandidateCount",
      "document",
      "educationalScrollContainers",
      "inspectedCandidateCount",
      "issueCount",
      "learnerVisibleCandidateCount",
      "scannerException",
      "tolerancePx",
      "workspace",
    ],
    label,
  );
  validateAuditPreamble(evidence, expectedBinding, label);
  exactLiteral(evidence.tolerancePx, 2, `${label}.tolerancePx`);
  const documentDimensions = validateDimensionRecord(
    evidence.document,
    ["clientWidth", "overflowPx", "scrollWidth"],
    `${label}.document`,
  );
  if (documentDimensions.overflowPx > 2) {
    contractError(`${label}.document has horizontal overflow.`);
  }
  const workspaceDimensions = validateDimensionRecord(
    evidence.workspace,
    ["clientWidth", "overflowPx", "overflowX", "scrollWidth"],
    `${label}.workspace`,
  );
  const overflowX = nonBlank(
    workspaceDimensions.record.overflowX,
    `${label}.workspace.overflowX`,
  );
  if (workspaceDimensions.overflowPx > 2 && !/auto|scroll/.test(overflowX)) {
    contractError(`${label}.workspace overflow is not locally scrollable.`);
  }
  const inspected = positiveInteger(
    evidence.inspectedCandidateCount,
    `${label}.inspectedCandidateCount`,
  );
  const visible = positiveInteger(
    evidence.learnerVisibleCandidateCount,
    `${label}.learnerVisibleCandidateCount`,
  );
  if (visible > inspected)
    contractError(`${label} visible candidates exceed inspected candidates.`);
  exactLiteral(
    evidence.clippedCandidateCount,
    0,
    `${label}.clippedCandidateCount`,
  );
  exactLiteral(evidence.issueCount, 0, `${label}.issueCount`);
  const containers = exactArray(
    evidence.educationalScrollContainers,
    `${label}.educationalScrollContainers`,
  ).map((item, index) => {
    const itemLabel = `${label}.educationalScrollContainers[${index}]`;
    const container = exactRecord(item, itemLabel);
    exactKeys(
      container,
      [
        "clientWidth",
        "focusable",
        "key",
        "learnerVisible",
        "maximumScrollLeft",
        "panHintKind",
        "reachedEnd",
        "reachedScrollLeft",
        "scrollWidth",
      ],
      itemLabel,
    );
    nonBlank(container.key, `${itemLabel}.key`);
    exactLiteral(container.focusable, true, `${itemLabel}.focusable`);
    exactLiteral(container.learnerVisible, true, `${itemLabel}.learnerVisible`);
    exactLiteral(container.reachedEnd, true, `${itemLabel}.reachedEnd`);
    if (
      !["explicit-attribute", "localized-nearby-text"].includes(
        nonBlank(container.panHintKind, `${itemLabel}.panHintKind`),
      )
    ) {
      contractError(`${itemLabel}.panHintKind is unsupported.`);
    }
    const clientWidth = finiteNumber(
      container.clientWidth,
      `${itemLabel}.clientWidth`,
    );
    const scrollWidth = finiteNumber(
      container.scrollWidth,
      `${itemLabel}.scrollWidth`,
    );
    const maximum = finiteNumber(
      container.maximumScrollLeft,
      `${itemLabel}.maximumScrollLeft`,
    );
    const reached = finiteNumber(
      container.reachedScrollLeft,
      `${itemLabel}.reachedScrollLeft`,
    );
    if (clientWidth < 0 || scrollWidth <= clientWidth + 2) {
      contractError(
        `${itemLabel} is not an overflowing educational container.`,
      );
    }
    if (
      !Object.is(maximum, scrollWidth - clientWidth) ||
      Math.abs(reached) < maximum - 2
    ) {
      contractError(
        `${itemLabel} did not prove its horizontal end is reachable.`,
      );
    }
    return container;
  });
  exactSortedUniqueStrings(
    containers.map((container) => String(container.key)),
    `${label}.educationalScrollContainers keys`,
  );
  return evidence as unknown as HkVisualizationLayoutAuditEvidence;
}

function validateCollisionEvidence(
  raw: unknown,
  expectedBinding: HkVisualizationPositiveAuditBinding,
) {
  const label = "collision evidence";
  const evidence = exactRecord(raw, label);
  exactKeys(
    evidence,
    [
      "auditCompleted",
      "binding",
      "canvasSurfaceCount",
      "inspected",
      "issueCount",
      "maximumRecordedIssues",
      "overlapExemptions",
      "scannerException",
      "svgSurfaceCount",
      "tolerancePx",
      "truncated",
    ],
    label,
  );
  validateAuditPreamble(evidence, expectedBinding, label);
  exactLiteral(evidence.tolerancePx, 4, `${label}.tolerancePx`);
  exactLiteral(
    evidence.maximumRecordedIssues,
    100,
    `${label}.maximumRecordedIssues`,
  );
  exactLiteral(evidence.canvasSurfaceCount, 0, `${label}.canvasSurfaceCount`);
  positiveInteger(evidence.svgSurfaceCount, `${label}.svgSurfaceCount`);
  exactLiteral(evidence.issueCount, 0, `${label}.issueCount`);
  exactLiteral(evidence.truncated, false, `${label}.truncated`);
  const inspected = exactRecord(evidence.inspected, `${label}.inspected`);
  exactKeys(
    inspected,
    [
      "candidatePairCounts",
      "htmlTextFragmentCount",
      "learnerControlCount",
      "paintedMarkCount",
      "svgTextFragmentCount",
    ],
    `${label}.inspected`,
  );
  nonNegativeInteger(
    inspected.learnerControlCount,
    `${label}.inspected.learnerControlCount`,
  );
  const htmlText = nonNegativeInteger(
    inspected.htmlTextFragmentCount,
    `${label}.inspected.htmlTextFragmentCount`,
  );
  const svgText = nonNegativeInteger(
    inspected.svgTextFragmentCount,
    `${label}.inspected.svgTextFragmentCount`,
  );
  if (htmlText + svgText === 0)
    contractError(`${label} scanned no text fragments.`);
  positiveInteger(
    inspected.paintedMarkCount,
    `${label}.inspected.paintedMarkCount`,
  );
  const pairCounts = exactRecord(
    inspected.candidatePairCounts,
    `${label}.inspected.candidatePairCounts`,
  );
  exactKeys(
    pairCounts,
    COLLISION_PAIR_KINDS,
    `${label}.inspected.candidatePairCounts`,
  );
  let totalPairs = 0;
  for (const kind of COLLISION_PAIR_KINDS) {
    totalPairs += nonNegativeInteger(
      pairCounts[kind],
      `${label}.inspected.candidatePairCounts.${kind}`,
    );
  }
  if (totalPairs === 0) contractError(`${label} checked no candidate pairs.`);
  const exemptions = exactArray(
    evidence.overlapExemptions,
    `${label}.overlapExemptions`,
  ).map((item, index) => {
    const itemLabel = `${label}.overlapExemptions[${index}]`;
    const exemption = exactRecord(item, itemLabel);
    exactKeys(
      exemption,
      [
        "areaRatio",
        "candidateCount",
        "heightRatio",
        "owner",
        "pair",
        "reason",
        "risk",
        "scope",
        "widthRatio",
      ],
      itemLabel,
    );
    const owner = nonBlank(exemption.owner, `${itemLabel}.owner`);
    nonBlank(exemption.reason, `${itemLabel}.reason`);
    exactLiteral(exemption.candidateCount, 2, `${itemLabel}.candidateCount`);
    exactLiteral(exemption.risk, "explicit-narrow-pair", `${itemLabel}.risk`);
    if (
      !["html-wrapper", "self", "svg-group"].includes(
        nonBlank(exemption.scope, `${itemLabel}.scope`),
      )
    ) {
      contractError(`${itemLabel}.scope is unsupported.`);
    }
    const pair = exactArray(exemption.pair, `${itemLabel}.pair`);
    if (
      pair.length !== 2 ||
      new Set(
        pair.map((value, pairIndex) =>
          nonBlank(value, `${itemLabel}.pair[${pairIndex}]`),
        ),
      ).size !== 2
    ) {
      contractError(`${itemLabel}.pair must contain two distinct members.`);
    }
    const area = finiteNumber(exemption.areaRatio, `${itemLabel}.areaRatio`);
    const width = finiteNumber(exemption.widthRatio, `${itemLabel}.widthRatio`);
    const height = finiteNumber(
      exemption.heightRatio,
      `${itemLabel}.heightRatio`,
    );
    if (
      area < 0 ||
      area > 0.3 ||
      width < 0 ||
      width > 0.9 ||
      height < 0 ||
      height > 0.8
    ) {
      contractError(`${itemLabel} is not a narrow overlap exemption.`);
    }
    return { exemption, owner };
  });
  exactSortedUniqueStrings(
    exemptions.map(({ owner }) => owner),
    `${label}.overlapExemptions owners`,
  );
  return evidence as unknown as HkVisualizationCollisionAuditEvidence;
}

function validateContrastTarget(raw: unknown, label: string) {
  const target = exactRecord(raw, label);
  exactKeys(
    target,
    [
      "background",
      "backgroundLuminance",
      "contrastRatio",
      "effectiveOpacity",
      "foreground",
      "requiredRatio",
      "target",
      "targetKey",
    ],
    label,
  );
  nonBlank(target.background, `${label}.background`);
  const backgroundLuminance = finiteNumber(
    target.backgroundLuminance,
    `${label}.backgroundLuminance`,
  );
  const contrastRatio = finiteNumber(
    target.contrastRatio,
    `${label}.contrastRatio`,
  );
  const opacity = finiteNumber(
    target.effectiveOpacity,
    `${label}.effectiveOpacity`,
  );
  nonBlank(target.foreground, `${label}.foreground`);
  const requiredRatio = finiteNumber(
    target.requiredRatio,
    `${label}.requiredRatio`,
  );
  nonBlank(target.target, `${label}.target`);
  nonBlank(target.targetKey, `${label}.targetKey`);
  if (
    backgroundLuminance < 0 ||
    backgroundLuminance > 1 ||
    opacity < 0 ||
    opacity > 1
  ) {
    contractError(`${label} luminance or opacity is out of range.`);
  }
  if (requiredRatio <= 0 || contrastRatio + 0.001 < requiredRatio) {
    contractError(`${label} does not meet its required contrast ratio.`);
  }
  return target as unknown as HkVisualizationContrastTargetEvidence;
}

function validateContrastEvidence(
  raw: unknown,
  expectedBinding: HkVisualizationPositiveAuditBinding,
) {
  const label = "contrast evidence";
  const evidence = exactRecord(raw, label);
  exactKeys(
    evidence,
    [
      "auditCompleted",
      "binding",
      "checkedTextCount",
      "evidenceCount",
      "issueCount",
      "normalizedTargetEvidenceHash",
      "scannerException",
      "targets",
      "worst",
    ],
    label,
  );
  validateAuditPreamble(evidence, expectedBinding, label);
  const targets = exactArray(evidence.targets, `${label}.targets`).map(
    (target, index) =>
      validateContrastTarget(target, `${label}.targets[${index}]`),
  );
  if (targets.length === 0) contractError(`${label}.targets cannot be empty.`);
  exactSortedUniqueStrings(
    targets.map(({ targetKey }) => targetKey),
    `${label}.target keys`,
  );
  if (
    positiveInteger(evidence.checkedTextCount, `${label}.checkedTextCount`) !==
      targets.length ||
    positiveInteger(evidence.evidenceCount, `${label}.evidenceCount`) !==
      targets.length
  ) {
    contractError(`${label} text/evidence counts do not equal its targets.`);
  }
  exactLiteral(evidence.issueCount, 0, `${label}.issueCount`);
  const targetHash = exactHash(
    evidence.normalizedTargetEvidenceHash,
    `${label}.normalizedTargetEvidenceHash`,
  );
  if (targetHash !== hashHkVisualizationContrastTargetEvidence(targets)) {
    contractError(`${label} normalized target evidence hash drifted.`);
  }
  const worst = validateContrastTarget(evidence.worst, `${label}.worst`);
  const expectedWorst = [...targets].sort((left, right) => {
    const leftScore = left.contrastRatio / left.requiredRatio;
    const rightScore = right.contrastRatio / right.requiredRatio;
    return (
      leftScore - rightScore ||
      compareCanonicalStrings(left.targetKey, right.targetKey)
    );
  })[0];
  if (!canonicalEqual(worst, expectedWorst)) {
    contractError(`${label}.worst is not the exact worst target.`);
  }
  return evidence as unknown as HkVisualizationContrastAuditEvidence;
}

function validateInteractiveControl(raw: unknown, label: string) {
  const control = exactRecord(raw, label);
  exactKeys(
    control,
    [
      "ariaDisabled",
      "controlKey",
      "declaredControlId",
      "disabled",
      "interactive",
      "learnerExposed",
      "pointerEventsNone",
      "role",
      "tag",
      "visuallyVisible",
    ],
    label,
  );
  nonBlank(control.controlKey, `${label}.controlKey`);
  nullableNonBlank(control.declaredControlId, `${label}.declaredControlId`);
  nonBlank(control.tag, `${label}.tag`);
  nullableNonBlank(control.role, `${label}.role`);
  exactLiteral(control.ariaDisabled, false, `${label}.ariaDisabled`);
  exactLiteral(control.disabled, false, `${label}.disabled`);
  exactLiteral(control.interactive, true, `${label}.interactive`);
  exactLiteral(control.learnerExposed, true, `${label}.learnerExposed`);
  exactLiteral(control.pointerEventsNone, false, `${label}.pointerEventsNone`);
  exactLiteral(control.visuallyVisible, true, `${label}.visuallyVisible`);
  return control as unknown as HkVisualizationInteractiveControlEvidence;
}

function validateControlVisibilityEvidence(
  raw: unknown,
  expectedBinding: HkVisualizationPositiveAuditBinding,
) {
  const label = "controlVisibility evidence";
  const evidence = exactRecord(raw, label);
  exactKeys(
    evidence,
    [
      "auditCompleted",
      "binding",
      "declaredStateControlCount",
      "disabledOrAriaDisabledCount",
      "interactiveControlKeysHash",
      "interactiveControls",
      "invisibleTabbableCount",
      "nonLearnerExposedCount",
      "observedInteractiveControlCount",
      "projectedAbsenceSetHash",
      "projectedFixedControlCount",
      "projectedFixedControls",
      "scannerException",
    ],
    label,
  );
  const binding = validateAuditPreamble(evidence, expectedBinding, label);
  exactLiteral(
    evidence.invisibleTabbableCount,
    0,
    `${label}.invisibleTabbableCount`,
  );
  exactLiteral(
    evidence.disabledOrAriaDisabledCount,
    0,
    `${label}.disabledOrAriaDisabledCount`,
  );
  exactLiteral(
    evidence.nonLearnerExposedCount,
    0,
    `${label}.nonLearnerExposedCount`,
  );
  const controls = exactArray(
    evidence.interactiveControls,
    `${label}.interactiveControls`,
  ).map((control, index) =>
    validateInteractiveControl(
      control,
      `${label}.interactiveControls[${index}]`,
    ),
  );
  if (controls.length === 0)
    contractError(`${label} scanned no interactive controls.`);
  const controlKeys = exactSortedUniqueStrings(
    controls.map(({ controlKey }) => controlKey),
    `${label}.interactive control keys`,
  );
  if (
    positiveInteger(
      evidence.observedInteractiveControlCount,
      `${label}.observedInteractiveControlCount`,
    ) !== controls.length
  ) {
    contractError(`${label}.observedInteractiveControlCount is wrong.`);
  }
  const declaredIds = controls.flatMap(({ declaredControlId }) =>
    declaredControlId === null ? [] : [declaredControlId],
  );
  if (new Set(declaredIds).size !== declaredIds.length) {
    contractError(`${label} duplicates a declared interactive control.`);
  }
  const projected = validateProjectedAbsences(
    evidence.projectedFixedControls,
    binding,
    `${label}.projectedFixedControls`,
  );
  if (
    nonNegativeInteger(
      evidence.projectedFixedControlCount,
      `${label}.projectedFixedControlCount`,
    ) !== projected.length
  ) {
    contractError(`${label}.projectedFixedControlCount is wrong.`);
  }
  const projectedIds = projected.map(({ controlId }) => controlId);
  if (declaredIds.some((controlId) => projectedIds.includes(controlId))) {
    contractError(
      `${label} treats a control as interactive and projected-fixed.`,
    );
  }
  if (
    nonNegativeInteger(
      evidence.declaredStateControlCount,
      `${label}.declaredStateControlCount`,
    ) !==
    declaredIds.length + projected.length
  ) {
    contractError(
      `${label} does not account for every declared state control.`,
    );
  }
  const keyHash = exactHash(
    evidence.interactiveControlKeysHash,
    `${label}.interactiveControlKeysHash`,
  );
  if (keyHash !== hashHkVisualizationInteractiveControlKeys(controlKeys)) {
    contractError(`${label} interactive control key hash drifted.`);
  }
  const projectionHash = exactHash(
    evidence.projectedAbsenceSetHash,
    `${label}.projectedAbsenceSetHash`,
  );
  if (
    projectionHash !== binding.projectedAbsenceSetHash ||
    projectionHash !== hashHkVisualizationProjectedAbsenceSet(projected)
  ) {
    contractError(`${label} projected absence hash drifted.`);
  }
  return evidence as unknown as HkVisualizationControlVisibilityAuditEvidence;
}

function validateProjectedExclusions(
  raw: unknown,
  projected: readonly HkVisualizationProjectedControlEvidence[],
  label: string,
) {
  const exclusions = exactSortedUniqueStrings(raw, label);
  const expected = projected.map(({ controlId }) => controlId);
  if (!canonicalEqual(exclusions, expected)) {
    contractError(
      `${label} does not equal the exact projected-fixed controls.`,
    );
  }
  return exclusions;
}

function validateTarget44Evidence(
  raw: unknown,
  expectedBinding: HkVisualizationPositiveAuditBinding,
  projected: readonly HkVisualizationProjectedControlEvidence[],
) {
  const label = "target44 evidence";
  const evidence = exactRecord(raw, label);
  exactKeys(
    evidence,
    [
      "auditCompleted",
      "auditedControlCount",
      "auditedControlKeysHash",
      "binding",
      "controls",
      "excludedProjectedFixedControlKeys",
      "minimumObserved",
      "projectedAbsenceSetHash",
      "scannerException",
    ],
    label,
  );
  const binding = validateAuditPreamble(evidence, expectedBinding, label);
  const controls = exactArray(evidence.controls, `${label}.controls`).map(
    (item, index) => {
      const itemLabel = `${label}.controls[${index}]`;
      const control = exactRecord(item, itemLabel);
      exactKeys(
        control,
        [
          "controlKey",
          "explicitPointerTarget",
          "minimum44",
          "ownHeight",
          "ownWidth",
          "pointerScopeIssueCount",
          "targetHeight",
          "targetPolicy",
          "targetWidth",
        ],
        itemLabel,
      );
      nonBlank(control.controlKey, `${itemLabel}.controlKey`);
      if (typeof control.explicitPointerTarget !== "boolean") {
        contractError(`${itemLabel}.explicitPointerTarget must be boolean.`);
      }
      exactLiteral(control.minimum44, true, `${itemLabel}.minimum44`);
      exactLiteral(
        control.pointerScopeIssueCount,
        0,
        `${itemLabel}.pointerScopeIssueCount`,
      );
      const ownHeight = finiteNumber(
        control.ownHeight,
        `${itemLabel}.ownHeight`,
      );
      const ownWidth = finiteNumber(control.ownWidth, `${itemLabel}.ownWidth`);
      const targetHeight = finiteNumber(
        control.targetHeight,
        `${itemLabel}.targetHeight`,
      );
      const targetWidth = finiteNumber(
        control.targetWidth,
        `${itemLabel}.targetWidth`,
      );
      if (
        ownHeight <= 0 ||
        ownWidth <= 0 ||
        targetHeight < 44 ||
        targetWidth < 44
      ) {
        contractError(`${itemLabel} does not expose a 44 by 44 target.`);
      }
      const policy = nonBlank(
        control.targetPolicy,
        `${itemLabel}.targetPolicy`,
      );
      if (!["associated-label", "self"].includes(policy)) {
        contractError(`${itemLabel}.targetPolicy is unsupported.`);
      }
      if (
        policy === "associated-label" &&
        control.explicitPointerTarget !== true
      ) {
        contractError(
          `${itemLabel} associated label is not an explicit pointer target.`,
        );
      }
      return control as unknown as HkVisualizationTarget44ControlEvidence;
    },
  );
  if (controls.length === 0) contractError(`${label} audited no controls.`);
  const keys = exactSortedUniqueStrings(
    controls.map(({ controlKey }) => controlKey),
    `${label}.control keys`,
  );
  if (
    positiveInteger(
      evidence.auditedControlCount,
      `${label}.auditedControlCount`,
    ) !== controls.length
  ) {
    contractError(`${label}.auditedControlCount is wrong.`);
  }
  const keyHash = exactHash(
    evidence.auditedControlKeysHash,
    `${label}.auditedControlKeysHash`,
  );
  if (keyHash !== hashHkVisualizationInteractiveControlKeys(keys)) {
    contractError(`${label} audited control key hash drifted.`);
  }
  validateProjectedExclusions(
    evidence.excludedProjectedFixedControlKeys,
    projected,
    `${label}.excludedProjectedFixedControlKeys`,
  );
  const projectionHash = exactHash(
    evidence.projectedAbsenceSetHash,
    `${label}.projectedAbsenceSetHash`,
  );
  if (projectionHash !== binding.projectedAbsenceSetHash) {
    contractError(`${label} projection hash differs from the binding.`);
  }
  const minimum = exactRecord(
    evidence.minimumObserved,
    `${label}.minimumObserved`,
  );
  exactKeys(
    minimum,
    ["controlKey", "height", "width"],
    `${label}.minimumObserved`,
  );
  const expectedMinimum = [...controls].sort((left, right) => {
    const leftMinimum = Math.min(left.targetHeight, left.targetWidth);
    const rightMinimum = Math.min(right.targetHeight, right.targetWidth);
    return (
      leftMinimum - rightMinimum ||
      compareCanonicalStrings(left.controlKey, right.controlKey)
    );
  })[0];
  if (
    nonBlank(minimum.controlKey, `${label}.minimumObserved.controlKey`) !==
      expectedMinimum.controlKey ||
    finiteNumber(minimum.height, `${label}.minimumObserved.height`) !==
      expectedMinimum.targetHeight ||
    finiteNumber(minimum.width, `${label}.minimumObserved.width`) !==
      expectedMinimum.targetWidth
  ) {
    contractError(`${label}.minimumObserved is not the exact minimum target.`);
  }
  return evidence as unknown as HkVisualizationTarget44AuditEvidence;
}

function validateHitTargetEvidence(
  raw: unknown,
  expectedBinding: HkVisualizationPositiveAuditBinding,
  projected: readonly HkVisualizationProjectedControlEvidence[],
) {
  const label = "hitTarget evidence";
  const evidence = exactRecord(raw, label);
  exactKeys(
    evidence,
    [
      "auditCompleted",
      "auditedControlCount",
      "auditedControlKeysHash",
      "binding",
      "controls",
      "excludedProjectedFixedControlKeys",
      "projectedAbsenceSetHash",
      "scannerException",
    ],
    label,
  );
  const binding = validateAuditPreamble(evidence, expectedBinding, label);
  const controls = exactArray(evidence.controls, `${label}.controls`).map(
    (item, index) => {
      const itemLabel = `${label}.controls[${index}]`;
      const control = exactRecord(item, itemLabel);
      exactKeys(
        control,
        [
          "acceptedHitPolicy",
          "centreX",
          "centreY",
          "controlKey",
          "effectiveTargetCentreHit",
          "ownCentreHit",
          "passed",
          "topHitKey",
        ],
        itemLabel,
      );
      const policy = nonBlank(
        control.acceptedHitPolicy,
        `${itemLabel}.acceptedHitPolicy`,
      );
      if (
        !["own-centre", "validated-associated-target-centre"].includes(policy)
      ) {
        contractError(`${itemLabel}.acceptedHitPolicy is unsupported.`);
      }
      finiteNumber(control.centreX, `${itemLabel}.centreX`);
      finiteNumber(control.centreY, `${itemLabel}.centreY`);
      nonBlank(control.controlKey, `${itemLabel}.controlKey`);
      if (
        typeof control.ownCentreHit !== "boolean" ||
        typeof control.effectiveTargetCentreHit !== "boolean"
      ) {
        contractError(`${itemLabel} hit flags must be boolean.`);
      }
      exactLiteral(control.passed, true, `${itemLabel}.passed`);
      nonBlank(control.topHitKey, `${itemLabel}.topHitKey`);
      if (policy === "own-centre" && control.ownCentreHit !== true) {
        contractError(`${itemLabel} did not hit its own centre.`);
      }
      if (
        policy === "validated-associated-target-centre" &&
        control.effectiveTargetCentreHit !== true
      ) {
        contractError(
          `${itemLabel} did not hit its validated associated target.`,
        );
      }
      return control as unknown as HkVisualizationHitTargetControlEvidence;
    },
  );
  if (controls.length === 0) contractError(`${label} audited no controls.`);
  const keys = exactSortedUniqueStrings(
    controls.map(({ controlKey }) => controlKey),
    `${label}.control keys`,
  );
  if (
    positiveInteger(
      evidence.auditedControlCount,
      `${label}.auditedControlCount`,
    ) !== controls.length
  ) {
    contractError(`${label}.auditedControlCount is wrong.`);
  }
  const keyHash = exactHash(
    evidence.auditedControlKeysHash,
    `${label}.auditedControlKeysHash`,
  );
  if (keyHash !== hashHkVisualizationInteractiveControlKeys(keys)) {
    contractError(`${label} audited control key hash drifted.`);
  }
  validateProjectedExclusions(
    evidence.excludedProjectedFixedControlKeys,
    projected,
    `${label}.excludedProjectedFixedControlKeys`,
  );
  const projectionHash = exactHash(
    evidence.projectedAbsenceSetHash,
    `${label}.projectedAbsenceSetHash`,
  );
  if (projectionHash !== binding.projectedAbsenceSetHash) {
    contractError(`${label} projection hash differs from the binding.`);
  }
  return evidence as unknown as HkVisualizationHitTargetAuditEvidence;
}

function validateReceiptEnvelope(
  raw: unknown,
  auditId: HkVisualizationMandatoryStateAuditId,
) {
  const label = `${auditId} receipt`;
  const receipt = exactRecord(raw, label);
  exactKeys(
    receipt,
    [
      "auditId",
      "evidence",
      "evidenceHash",
      "failure",
      "issues",
      "retryCount",
      "status",
    ],
    label,
  );
  exactLiteral(receipt.auditId, auditId, `${label}.auditId`);
  exactLiteral(receipt.status, "passed", `${label}.status`);
  exactLiteral(receipt.failure, null, `${label}.failure`);
  exactLiteral(receipt.retryCount, 0, `${label}.retryCount`);
  const issues = exactArray(receipt.issues, `${label}.issues`);
  if (issues.length !== 0) contractError(`${label}.issues must be empty.`);
  const evidence = canonicalEvidence(receipt.evidence, `${label}.evidence`);
  if (evidenceIsEmpty(evidence))
    contractError(`${label}.evidence cannot be empty.`);
  const evidenceHash = exactHash(receipt.evidenceHash, `${label}.evidenceHash`);
  if (evidenceHash !== hashHkVisualizationAuditEvidence(auditId, evidence)) {
    contractError(`${label}.evidenceHash does not match its evidence.`);
  }
  return { evidence, evidenceHash };
}

export function validateHkVisualizationPositiveAuditReceiptSet(input: {
  expectedBinding: HkVisualizationPositiveAuditBinding;
  receipts: unknown;
}): HkVisualizationPositiveAuditValidationEvidence {
  const expectedBinding = validateBindingShape(
    input.expectedBinding,
    "expectedBinding",
  );
  const receipts = exactRecord(input.receipts, "positive audit receipt set");
  exactKeys(
    receipts,
    HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS,
    "positive audit receipt set",
  );

  const envelope = Object.fromEntries(
    HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS.map((auditId) => [
      auditId,
      validateReceiptEnvelope(receipts[auditId], auditId),
    ]),
  ) as Record<
    HkVisualizationMandatoryStateAuditId,
    ReturnType<typeof validateReceiptEnvelope>
  >;

  const math = validateMathEvidence(envelope.math.evidence, expectedBinding);
  validateLayoutEvidence(envelope.layout.evidence, expectedBinding);
  validateCollisionEvidence(envelope.collision.evidence, expectedBinding);
  validateContrastEvidence(envelope.contrast.evidence, expectedBinding);
  const visibility = validateControlVisibilityEvidence(
    envelope.controlVisibility.evidence,
    expectedBinding,
  );
  const target44 = validateTarget44Evidence(
    envelope.target44.evidence,
    expectedBinding,
    visibility.projectedFixedControls,
  );
  const hitTarget = validateHitTargetEvidence(
    envelope.hitTarget.evidence,
    expectedBinding,
    visibility.projectedFixedControls,
  );

  if (
    visibility.interactiveControlKeysHash !== target44.auditedControlKeysHash ||
    visibility.interactiveControlKeysHash !== hitTarget.auditedControlKeysHash
  ) {
    contractError(
      "controlVisibility, target44, and hitTarget control key hashes differ.",
    );
  }
  if (
    visibility.projectedAbsenceSetHash !== target44.projectedAbsenceSetHash ||
    visibility.projectedAbsenceSetHash !== hitTarget.projectedAbsenceSetHash ||
    visibility.projectedAbsenceSetHash !== math.projectedAbsenceSetHash ||
    visibility.projectedAbsenceSetHash !==
      expectedBinding.projectedAbsenceSetHash
  ) {
    contractError("math and control projected absence hashes differ.");
  }
  if (
    !canonicalEqual(math.projectedAbsences, visibility.projectedFixedControls)
  ) {
    contractError("math and control projected absence evidence differ.");
  }

  const typedReceipts =
    receipts as unknown as HkVisualizationMandatoryAuditReceiptSet;
  return Object.freeze({
    auditEvidenceHashes: Object.freeze(
      Object.fromEntries(
        HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS.map((auditId) => [
          auditId,
          envelope[auditId].evidenceHash,
        ]),
      ) as Record<HkVisualizationMandatoryStateAuditId, string>,
    ),
    bindingHash: hashHkVisualizationPositiveAuditBinding(expectedBinding),
    contractVersion: HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
    interactiveControlKeysHash: visibility.interactiveControlKeysHash,
    projectedAbsenceSetHash: visibility.projectedAbsenceSetHash,
    receiptSetHash: hashHkVisualizationPositiveAuditReceiptSet(typedReceipts),
    status: "passed",
  });
}
