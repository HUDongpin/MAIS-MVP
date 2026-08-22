import assert from "node:assert/strict";
import test from "node:test";
import {
  HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS,
  HK_VISUALIZATION_PROVISIONAL_CHUNK_BOUNDARY_MS,
  HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS,
  HK_VISUALIZATION_PROVISIONAL_FINAL_RESET_MS,
  HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
  HK_VISUALIZATION_PROVISIONAL_NON_RANGE_ACTION_MS,
  HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS,
  HK_VISUALIZATION_PROVISIONAL_REHYDRATION_ACTION_MS,
  HK_VISUALIZATION_PROVISIONAL_SCROLL_OBSERVATION_AND_SIX_AUDITS_MS,
  HK_VISUALIZATION_PROVISIONAL_STATE_MATH_AND_SCROLL_DISCOVERY_MS,
  HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS,
  HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS,
  HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_CONTAINER_COUNT,
  HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_OBSERVATION_COUNT,
  HK_VISUALIZATION_STATE_CHUNK_MAXIMUM_SIZE,
  buildHkVisualizationScrollObservationSet,
  buildHkVisualizationStateCellPlan,
  calculateHkVisualizationAuditedExecutionMs,
  calculateHkVisualizationProvisionalBudget,
  canonicalHkVisualizationJson,
  deriveHkVisualizationRunHash,
  hashHkVisualizationAuditEvidence,
  hashHkVisualizationDescriptor,
  hashHkVisualizationMatrixManifest,
  hashHkVisualizationModeContext,
  hashHkVisualizationRehydrationActions,
  hashHkVisualizationStateSignature,
  sha256HkVisualizationCanonical,
  validateHkVisualizationStateChunkReceipts,
  type HkVisualizationFinalResetReceipt,
  type HkVisualizationMandatoryAuditReceiptSet,
  type HkVisualizationNonRangeActionInput,
  type HkVisualizationNonRangeActionReceipt,
  type HkVisualizationPreflightCellStateInput,
  type HkVisualizationStateCellPlan,
  type HkVisualizationStateChunkReceipt,
  type HkVisualizationStateReceipt,
  type HkVisualizationScrollObservationSet,
} from "./hk-visualization-state-chunk-contract";

const RUN_ID = "hk-exact-run-001";
const BUILD_ID = "build-deadbeef";
const BUILD_HASH = sha256HkVisualizationCanonical({
  buildId: BUILD_ID,
  gitCommit: "3f8f12c4d3fd2efe938d1b07cab6289315f108dd",
});
const AUDIT_HASH = sha256HkVisualizationCanonical({
  auditVersion: "all-seven-v1",
});

function state(
  index: number,
  modeId = "graph",
): HkVisualizationPreflightCellStateInput {
  const expectedSignature = `x=${index}|y=${index + 1}`;
  const replayActionId = `mode:view:${modeId}`;
  return Object.freeze({
    actionSignature: `set:x=${index};set:y=${index + 1}`,
    descriptorHash: hashHkVisualizationDescriptor({
      controls: [
        { controlId: "x", maximum: 100, minimum: 0, step: 1 },
        { controlId: "y", maximum: 101, minimum: 1, step: 1 },
      ],
      index,
    }),
    domainId: index % 2 === 0 ? "fixture-domain-v1" : null,
    expectedSignature,
    id: `state-${String(index).padStart(4, "0")}`,
    modeId,
    modeContext: Object.freeze([
      Object.freeze({
        activeModeId: modeId,
        dependsOnGroupId: null,
        groupId: "view",
        replayActionId,
        replaySelector: `[data-viz-mode-id="${modeId}"]`,
      }),
    ]),
    orderedControlIds: Object.freeze(["x", "y"]),
    reasons: Object.freeze([
      index === 0 ? "mode:graph:base" : `endpoint-combination:${index}`,
    ]),
    requestedSignature: expectedSignature,
    rehydrationActions: Object.freeze([
      Object.freeze({
        actionId: replayActionId,
        actionKind: "activate-mode" as const,
        controlId: null,
        expectedValue: modeId,
        projectedAbsence: null,
        requestedValue: modeId,
        selector: `[data-viz-mode-id="${modeId}"]`,
        targetPolicy: "required-interactive" as const,
      }),
      Object.freeze({
        actionId: "range:x",
        actionKind: "set-range-value" as const,
        controlId: "x",
        expectedValue: index,
        projectedAbsence: null,
        requestedValue: index,
        selector: '[data-viz-control-id="x"]',
        targetPolicy: "required-interactive" as const,
      }),
      Object.freeze({
        actionId: "range:y",
        actionKind: "set-range-value" as const,
        controlId: "y",
        expectedValue: index + 1,
        projectedAbsence: null,
        requestedValue: index + 1,
        selector: '[data-viz-control-id="y"]',
        targetPolicy: "required-interactive" as const,
      }),
    ]),
    startingSignature: "x=0|y=1",
  });
}

function nonRangeActionPlan(
  count: number,
): readonly HkVisualizationNonRangeActionInput[] {
  const policies = [
    {
      actionKind: "click" as const,
      expectedOutcome: "state-change" as const,
      requestedValue: null,
    },
    {
      actionKind: "keyboard-activate" as const,
      expectedOutcome: "focus-activate" as const,
      requestedValue: "Enter",
    },
    {
      actionKind: "set-value" as const,
      expectedOutcome: "meaningful-change" as const,
      requestedValue: 42,
    },
    {
      actionKind: "focus" as const,
      expectedOutcome: "exact-no-change" as const,
      requestedValue: null,
    },
  ];
  return Object.freeze(
    Array.from({ length: count }, (_, index) => {
      const policy = policies[index % policies.length];
      return Object.freeze({
        actionId: `non-range-${String(index).padStart(3, "0")}`,
        actionKind: policy.actionKind,
        expectedOutcome: policy.expectedOutcome,
        requestedValue: policy.requestedValue,
        selector: `[data-viz-non-range="${index}"]`,
        targetId: `non-range-target-${index}`,
      });
    }),
  );
}

const KEYBOARD_ADJUST_KEYS = Object.freeze([
  "ArrowRight",
  "ArrowUp",
  "Home",
  "End",
] as const);

function keyboardAdjustActionPlan(
  requestedValues: readonly (number | string | null)[] = KEYBOARD_ADJUST_KEYS,
): readonly HkVisualizationNonRangeActionInput[] {
  return Object.freeze(
    requestedValues.map((requestedValue, index) =>
      Object.freeze({
        actionId: `keyboard-adjust-${String(index).padStart(3, "0")}`,
        actionKind: "keyboard-adjust" as const,
        expectedOutcome: "state-change" as const,
        requestedValue,
        selector: `[data-viz-keyboard-adjust="${index}"]`,
        targetId: `keyboard-adjust-target-${index}`,
      }),
    ),
  );
}

function buildNonRangeActionCell(
  cellId: string,
  nonRangeActions: readonly HkVisualizationNonRangeActionInput[],
) {
  return buildHkVisualizationStateCellPlan({
    cellId,
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions,
    resetExpectedDescriptorHash: hashHkVisualizationDescriptor({
      reset: cellId,
    }),
    resetExpectedSignature: "reset-signature",
    states: [state(0)],
  });
}

function cell(
  cellId: string,
  stateCount: number,
): HkVisualizationStateCellPlan {
  return buildHkVisualizationStateCellPlan({
    cellId,
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(2),
    resetExpectedDescriptorHash: hashHkVisualizationDescriptor({
      reset: cellId,
    }),
    resetExpectedSignature: "x=0|y=1",
    states: Object.freeze(
      Array.from({ length: stateCount }, (_, index) => state(index)),
    ),
  });
}

function nonRangeInputs(plan: HkVisualizationStateCellPlan) {
  return plan.nonRangeActions.map((action) => ({
    actionId: action.actionId,
    actionKind: action.actionKind,
    expectedOutcome: action.expectedOutcome,
    requestedValue: action.requestedValue,
    selector: action.selector,
    targetId: action.targetId,
  }));
}

function passingNonRangeActionReceipt(
  action: HkVisualizationStateCellPlan["nonRangeActions"][number],
): HkVisualizationNonRangeActionReceipt {
  const beforeSignature = `before:${action.actionId}`;
  const changes =
    action.expectedOutcome === "state-change"
      ? {
          afterSignature: `after:${action.actionId}`,
          contractStateChanged: true,
          focusActivated: false,
          meaningfulEvidenceChanged: false,
        }
      : action.expectedOutcome === "meaningful-change"
        ? {
            afterSignature: `after:${action.actionId}`,
            contractStateChanged: false,
            focusActivated: false,
            meaningfulEvidenceChanged: true,
          }
        : action.expectedOutcome === "focus-activate"
          ? {
              afterSignature: beforeSignature,
              contractStateChanged: false,
              focusActivated: true,
              meaningfulEvidenceChanged: false,
            }
          : {
              afterSignature: beforeSignature,
              contractStateChanged: false,
              focusActivated: false,
              meaningfulEvidenceChanged: false,
            };
  const audits = auditSet(`non-range:${action.actionId}`);
  return Object.freeze({
    actionId: action.actionId,
    actionIndex: action.index,
    actionKind: action.actionKind,
    afterSignature: changes.afterSignature,
    audits,
    beforeSignature,
    contractStateChanged: changes.contractStateChanged,
    expectedOutcome: action.expectedOutcome,
    failure: null,
    focusActivated: changes.focusActivated,
    inputHash: action.inputHash,
    meaningfulEvidenceChanged: changes.meaningfulEvidenceChanged,
    retryCount: 0,
    scrollObservationSet: scrollObservationSet(
      `non-range:${action.actionId}`,
      0,
      audits,
    ),
    status: "passed",
  });
}

function auditSet(seed: string): HkVisualizationMandatoryAuditReceiptSet {
  return Object.freeze(
    Object.fromEntries(
      HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS.map((auditId) => [
        auditId,
        Object.freeze(
          (() => {
            const evidence = Object.freeze({
              auditId,
              measurements: Object.freeze([{ name: "fixture", value: seed }]),
              schemaVersion: "hk-viz-audit-evidence-v1",
            });
            return {
              auditId,
              evidence,
              evidenceHash: hashHkVisualizationAuditEvidence(auditId, evidence),
              failure: null,
              issues: Object.freeze([]),
              retryCount: 0,
              status: "passed" as const,
            };
          })(),
        ),
      ]),
    ) as unknown as HkVisualizationMandatoryAuditReceiptSet,
  );
}

function scrollObservationSet(
  seed: string,
  containerCount = 0,
  topLevelAudits = auditSet(seed),
): HkVisualizationScrollObservationSet {
  const containers = Array.from({ length: containerCount }, (_, index) => ({
    clientWidth: 180,
    containerKey: `scroll-${index}`,
    contentKind: index === 0 ? ("formula" as const) : ("surface" as const),
    maximumScrollLeft: 420,
    scrollWidth: 600,
  }));
  const schedule = [
    { position: "all-start" as const, targetContainerKey: null },
    ...containers.flatMap(({ containerKey }) => [
      { position: "mid" as const, targetContainerKey: containerKey },
      { position: "end" as const, targetContainerKey: containerKey },
    ]),
  ];
  return buildHkVisualizationScrollObservationSet({
    containers,
    observations: schedule.map(({ position, targetContainerKey }, observationIndex) => ({
      audits: Object.fromEntries(
        HK_VISUALIZATION_SCROLL_POSITION_AUDIT_IDS.map((auditId) => [
          auditId,
          observationIndex === 0
            ? topLevelAudits[auditId]
            : auditSet(`${seed}:${observationIndex}`)[auditId],
        ]),
      ) as never,
      observationId:
        position === "all-start"
          ? "all-start"
          : `${targetContainerKey}:${position}`,
      position,
      positions: containers.map(({ containerKey, maximumScrollLeft }) => {
        const requestedScrollLeft =
          containerKey !== targetContainerKey
            ? 0
            : position === "mid"
              ? Math.round(maximumScrollLeft / 2)
              : maximumScrollLeft;
        return {
          containerKey,
          maximumScrollLeft,
          reachedScrollLeft: requestedScrollLeft,
          requestedScrollLeft,
          restoreReachedScrollLeft: 0,
          restoreSucceeded: true as const,
        };
      }),
      positiveEvidenceCounts: {
        collisionCandidates: 2,
        contrastText: 3,
        controlVisibilityCandidates: 1,
        hitTargetCandidates: 1,
        layoutCandidates: 4,
        target44Candidates: 1,
      },
      targetContainerKey,
    })),
  });
}

function passingStateReceipt(
  preflight: HkVisualizationStateCellPlan["states"][number],
): HkVisualizationStateReceipt {
  const signatureHash = hashHkVisualizationStateSignature(
    preflight.expectedSignature,
  );
  const audits = auditSet(preflight.id);
  return Object.freeze({
    audits,
    domainId: preflight.domainId,
    expectedDescriptorHash: preflight.descriptorHash,
    expectedSignature: preflight.expectedSignature,
    expectedSignatureHash: signatureHash,
    failure: null,
    inputHash: preflight.inputHash,
    modeId: preflight.modeId,
    modeContextHash: preflight.modeContextHash,
    observedDescriptorHash: preflight.descriptorHash,
    observedSignature: preflight.expectedSignature,
    observedSignatureHash: signatureHash,
    retryCount: 0,
    rehydrationActionsHash: preflight.rehydrationActionsHash,
    stateId: preflight.id,
    stateIndex: preflight.index,
    status: "passed",
    scrollObservationSet: scrollObservationSet(preflight.id, 0, audits),
  });
}

function passingResetReceipt(
  plan: HkVisualizationStateCellPlan,
): HkVisualizationFinalResetReceipt {
  const signatureHash = hashHkVisualizationStateSignature(
    plan.resetExpectedSignature,
  );
  const audits = auditSet(`${plan.cellId}:final-reset`);
  return Object.freeze({
    audits,
    expectedDescriptorHash: plan.resetExpectedDescriptorHash,
    expectedSignature: plan.resetExpectedSignature,
    expectedSignatureHash: signatureHash,
    failure: null,
    observedDescriptorHash: plan.resetExpectedDescriptorHash,
    observedSignature: plan.resetExpectedSignature,
    observedSignatureHash: signatureHash,
    retryCount: 0,
    status: "passed",
    scrollObservationSet: scrollObservationSet(
      `${plan.cellId}:final-reset`,
      0,
      audits,
    ),
  });
}

function passingReceipts(plans: readonly HkVisualizationStateCellPlan[]) {
  const matrixManifestHash = hashHkVisualizationMatrixManifest(plans);
  const runHash = deriveHkVisualizationRunHash({
    auditHash: AUDIT_HASH,
    buildHash: BUILD_HASH,
    buildId: BUILD_ID,
    matrixManifestHash,
    runId: RUN_ID,
  });
  return plans.flatMap((plan) =>
    plan.chunks.map((chunk) =>
      Object.freeze({
        auditHash: AUDIT_HASH,
        buildHash: BUILD_HASH,
        buildId: BUILD_ID,
        cellExecutionHash: plan.cellExecutionHash,
        cellId: plan.cellId,
        chunkId: chunk.chunkId,
        end: chunk.end,
        failure: null,
        finalReset:
          chunk.end === plan.states.length ? passingResetReceipt(plan) : null,
        matrixManifestHash,
        nonRangeActionReceipts: Object.freeze(
          chunk.nonRangeActions.map(passingNonRangeActionReceipt),
        ),
        planHash: plan.planHash,
        retryCount: 0,
        runId: RUN_ID,
        runHash,
        start: chunk.start,
        stateReceipts: Object.freeze(
          plan.states.slice(chunk.start, chunk.end).map(passingStateReceipt),
        ),
        status: "passed" as const,
      } satisfies HkVisualizationStateChunkReceipt),
    ),
  );
}

function clone<T>(value: T): any {
  return structuredClone(value);
}

function validate(
  plans: readonly HkVisualizationStateCellPlan[],
  receipts: readonly HkVisualizationStateChunkReceipt[],
) {
  const matrixManifestHash = hashHkVisualizationMatrixManifest(plans);
  return validateHkVisualizationStateChunkReceipts({
    auditHash: AUDIT_HASH,
    buildHash: BUILD_HASH,
    buildId: BUILD_ID,
    expectedCells: plans,
    matrixManifestHash,
    receipts,
    runId: RUN_ID,
    runHash: deriveHkVisualizationRunHash({
      auditHash: AUDIT_HASH,
      buildHash: BUILD_HASH,
      buildId: BUILD_ID,
      matrixManifestHash,
      runId: RUN_ID,
    }),
  });
}

test("canonical JSON and SHA-256 are stable across object insertion order but preserve array order", () => {
  const left = { z: [3, { b: 2, a: 1 }], a: -0 };
  const right = { a: 0, z: [3, { a: 1, b: 2 }] };
  assert.equal(
    canonicalHkVisualizationJson(left),
    canonicalHkVisualizationJson(right),
  );
  assert.equal(
    sha256HkVisualizationCanonical(left),
    sha256HkVisualizationCanonical(right),
  );
  assert.notEqual(
    sha256HkVisualizationCanonical({ states: ["first", "second"] }),
    sha256HkVisualizationCanonical({ states: ["second", "first"] }),
  );
  assert.match(sha256HkVisualizationCanonical(left), /^[0-9a-f]{64}$/);
});

test("canonical JSON fails closed for non-finite, undefined, sparse, cyclic, accessor, symbol, and non-plain data", () => {
  assert.throws(
    () => canonicalHkVisualizationJson({ value: Number.NaN }),
    /non-finite/,
  );
  assert.throws(
    () => canonicalHkVisualizationJson({ value: undefined }),
    /unsupported undefined/,
  );
  assert.throws(
    () => canonicalHkVisualizationJson(new Array(1)),
    /sparse array/,
  );
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalHkVisualizationJson(cyclic), /cyclic/);
  const accessor = Object.defineProperty({}, "value", {
    enumerable: true,
    get: () => 1,
  });
  assert.throws(
    () => canonicalHkVisualizationJson(accessor),
    /JSON data property/,
  );
  const symbol = { value: 1, [Symbol("hidden")]: 2 };
  assert.throws(() => canonicalHkVisualizationJson(symbol), /symbol property/);
  assert.throws(
    () => canonicalHkVisualizationJson(new Date()),
    /plain JSON objects/,
  );
});

test("canonical JSON safely retains __proto__ as data rather than mutating the canonical object", () => {
  const value = JSON.parse('{"__proto__":{"polluted":true},"constructor":1}');
  assert.equal(
    canonicalHkVisualizationJson(value),
    '{"__proto__":{"polluted":true},"constructor":1}',
  );
  assert.equal(({} as { polluted?: boolean }).polluted, undefined);
});

test("budget separates every conservative runtime component and is monotonic by actual work", () => {
  const small = calculateHkVisualizationProvisionalBudget({
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(0),
    rehydrationActionCount: 3,
    stateCount: 1,
  });
  const larger = calculateHkVisualizationProvisionalBudget({
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(1),
    rehydrationActionCount: 6,
    stateCount: 2,
  });
  assert.deepEqual(small, {
    chunkBoundaryMs: HK_VISUALIZATION_PROVISIONAL_CHUNK_BOUNDARY_MS,
    chunkCount: 1,
    executionSetupMs: HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS,
    finalResetMs: HK_VISUALIZATION_PROVISIONAL_FINAL_RESET_MS,
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActionCount: 0,
    nonRangeActionMs: 0,
    preflightMs: HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS,
    rehydrationActionCount: 3,
    rehydrationActionMs: 3 * HK_VISUALIZATION_PROVISIONAL_REHYDRATION_ACTION_MS,
    stateCount: 1,
    stateAndMandatoryAuditsMs: HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS,
    totalMs:
      HK_VISUALIZATION_PROVISIONAL_PREFLIGHT_MS +
      HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS +
      HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS +
      HK_VISUALIZATION_PROVISIONAL_CHUNK_BOUNDARY_MS +
      3 * HK_VISUALIZATION_PROVISIONAL_REHYDRATION_ACTION_MS +
      HK_VISUALIZATION_PROVISIONAL_FINAL_RESET_MS +
      HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
  });
  assert.ok(larger.totalMs > small.totalMs);
  assert.equal(
    larger.nonRangeActionMs,
    HK_VISUALIZATION_PROVISIONAL_NON_RANGE_ACTION_MS,
  );
  const baseline = calculateHkVisualizationProvisionalBudget({
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(3),
    rehydrationActionCount: 33,
    stateCount: 11,
  });
  assert.equal(
    calculateHkVisualizationProvisionalBudget({
      marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
      nonRangeActions: nonRangeActionPlan(3),
      rehydrationActionCount: 36,
      stateCount: 12,
    }).totalMs - baseline.totalMs,
    HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS +
      3 * HK_VISUALIZATION_PROVISIONAL_REHYDRATION_ACTION_MS,
  );
  assert.equal(
    calculateHkVisualizationProvisionalBudget({
      marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
      nonRangeActions: nonRangeActionPlan(4),
      rehydrationActionCount: 33,
      stateCount: 11,
    }).totalMs - baseline.totalMs,
    HK_VISUALIZATION_PROVISIONAL_NON_RANGE_ACTION_MS,
  );
  assert.equal(
    calculateHkVisualizationProvisionalBudget({
      marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
      nonRangeActions: nonRangeActionPlan(3),
      rehydrationActionCount: 34,
      stateCount: 11,
    }).totalMs - baseline.totalMs,
    HK_VISUALIZATION_PROVISIONAL_REHYDRATION_ACTION_MS,
  );
});

test("fresh exact11 benchmark plus bounded scroll schedule drives the state audit reserve", () => {
  assert.ok(HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS > 5_000);
  assert.ok(HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS > 387_478 / 95);
  const plan = cell("coordinates:desktop:en:light", 2_099);
  const budget = calculateHkVisualizationProvisionalBudget({
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(3),
    rehydrationActionCount: 2_099 * 3,
    stateCount: 2_099,
  });
  assert.equal(
    budget.stateAndMandatoryAuditsMs,
    2_099 * HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS,
  );
  assert.equal(budget.chunkCount, 66);
  assert.equal(
    budget.executionSetupMs,
    66 * HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS,
  );
  assert.equal(plan.budget.totalMs, budget.totalMs - 10_000);
  assert.equal(
    plan.chunks.reduce((sum, chunk) => sum + chunk.budget.totalMs, 0),
    plan.budget.totalMs,
  );
  assert.equal(
    plan.chunks.reduce((sum, chunk) => sum + chunk.budget.marginMs, 0),
    HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
  );
  assert.deepEqual(
    plan.chunks.map((chunk) => chunk.budget.marginMs),
    [...Array(6).fill(910), ...Array(60).fill(909)],
  );
  assert.ok(
    plan.chunks.every(
      (chunk) =>
        chunk.budget.executionSetupMs ===
        HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS,
    ),
  );
});

test("scroll observations are exact all-start then each stable container mid/end, including formula-only content", () => {
  const none = scrollObservationSet("none", 0);
  assert.equal(none.containerCount, 0);
  assert.equal(none.observationCount, 1);
  assert.deepEqual(
    none.observations.map(({ observationId }) => observationId),
    ["all-start"],
  );

  const two = scrollObservationSet("two", 2);
  assert.equal(two.containerCount, 2);
  assert.equal(two.observationCount, 5);
  assert.deepEqual(
    two.containers.map(({ containerKey, contentKind }) => ({
      containerKey,
      contentKind,
    })),
    [
      { containerKey: "scroll-0", contentKind: "formula" },
      { containerKey: "scroll-1", contentKind: "surface" },
    ],
  );
  assert.deepEqual(
    two.observations.map(
      ({ observationId, position, targetContainerKey }) => ({
        observationId,
        position,
        targetContainerKey,
      }),
    ),
    [
      {
        observationId: "all-start",
        position: "all-start",
        targetContainerKey: null,
      },
      {
        observationId: "scroll-0:mid",
        position: "mid",
        targetContainerKey: "scroll-0",
      },
      {
        observationId: "scroll-0:end",
        position: "end",
        targetContainerKey: "scroll-0",
      },
      {
        observationId: "scroll-1:mid",
        position: "mid",
        targetContainerKey: "scroll-1",
      },
      {
        observationId: "scroll-1:end",
        position: "end",
        targetContainerKey: "scroll-1",
      },
    ],
  );
  assert.ok(two.observations.every(({ positions }) => positions.length === 2));
  assert.ok(
    two.observations.every(({ positions }) =>
      positions.every(
        ({ restoreReachedScrollLeft, restoreSucceeded }) =>
          restoreSucceeded && restoreReachedScrollLeft === 0,
      ),
    ),
  );
  assert.match(two.scheduleHash, /^[0-9a-f]{64}$/);
  assert.match(two.observationSetHash, /^[0-9a-f]{64}$/);
  assert.ok(Object.isFrozen(two));
});

test("scroll observation builder fails closed on duplicate keys, schedule drift, reach/restore drift, empty evidence, and excess containers", () => {
  const valid = clone(scrollObservationSet("invalid", 2));
  const cases: Array<{ mutate: (value: any) => void; pattern: RegExp }> = [
    {
      mutate: (value) => (value.containers[1].containerKey = "scroll-0"),
      pattern: /container key.*duplicate|stable.*key/i,
    },
    {
      mutate: (value) => value.observations.reverse(),
      pattern: /all-start|schedule|order/i,
    },
    {
      mutate: (value) => (value.observations[1].positions[0].reachedScrollLeft = 0),
      pattern: /reachedScrollLeft|requested/i,
    },
    {
      mutate: (value) =>
        (value.observations[1].positions[0].restoreSucceeded = false),
      pattern: /restore/i,
    },
    {
      mutate: (value) =>
        (value.observations[0].positiveEvidenceCounts.contrastText = 0),
      pattern: /positive.*contrastText|contrastText.*positive/i,
    },
    {
      mutate: (value) => delete value.observations[0].audits.layout,
      pattern: /six scroll-position audits|exactly/i,
    },
  ];
  for (const invalid of cases) {
    const value = clone(valid);
    invalid.mutate(value);
    assert.throws(
      () =>
        buildHkVisualizationScrollObservationSet({
          containers: value.containers,
          observations: value.observations,
        }),
      invalid.pattern,
    );
  }

  assert.throws(
    () =>
      scrollObservationSet(
        "too-many",
        HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_CONTAINER_COUNT + 1,
      ),
    /container.*maximum|too many/i,
  );
  assert.equal(
    HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_OBSERVATION_COUNT,
    1 + 2 * HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_CONTAINER_COUNT,
  );
});

test("audited execution budget derives from exact observation count and provisional state reserve covers the bounded maximum", () => {
  const one = calculateHkVisualizationAuditedExecutionMs(1);
  const five = calculateHkVisualizationAuditedExecutionMs(5);
  assert.equal(
    one,
    HK_VISUALIZATION_PROVISIONAL_STATE_MATH_AND_SCROLL_DISCOVERY_MS +
      HK_VISUALIZATION_PROVISIONAL_SCROLL_OBSERVATION_AND_SIX_AUDITS_MS,
  );
  assert.equal(
    five - one,
    4 * HK_VISUALIZATION_PROVISIONAL_SCROLL_OBSERVATION_AND_SIX_AUDITS_MS,
  );
  assert.ok(one > 5_000);
  assert.equal(
    HK_VISUALIZATION_PROVISIONAL_STATE_AND_AUDITS_MS,
    calculateHkVisualizationAuditedExecutionMs(
      HK_VISUALIZATION_SCROLL_POSITION_MAXIMUM_OBSERVATION_COUNT,
    ),
  );
  assert.throws(
    () => calculateHkVisualizationAuditedExecutionMs(0),
    /observationCount.*positive/i,
  );
});

test("invalid and overflowing budget inputs fail closed", () => {
  assert.throws(
    () =>
      calculateHkVisualizationProvisionalBudget({
        marginMs: -1,
        nonRangeActions: nonRangeActionPlan(0),
        rehydrationActionCount: 0,
        stateCount: 1,
      }),
    /marginMs/,
  );
  assert.throws(
    () =>
      calculateHkVisualizationProvisionalBudget({
        marginMs: 0,
        nonRangeActions: null as never,
        rehydrationActionCount: 0,
        stateCount: 1,
      }),
    /nonRangeActions/,
  );
  assert.throws(
    () =>
      calculateHkVisualizationProvisionalBudget({
        marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
        nonRangeActions: nonRangeActionPlan(0),
        rehydrationActionCount: 0,
        stateCount: Number.MAX_SAFE_INTEGER,
      }),
    /overflowed/,
  );
  assert.throws(
    () =>
      calculateHkVisualizationProvisionalBudget({
        marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS - 1,
        nonRangeActions: nonRangeActionPlan(0),
        rehydrationActionCount: 0,
        stateCount: 1,
      }),
    /marginMs.*60000/,
  );
});

test("2099 ordered states produce exactly 66 deterministic chunks of at most 32 with exact half-open ranges", () => {
  const plan = cell("coordinates:desktop:en:light", 2_099);
  assert.equal(plan.chunks.length, 66);
  assert.deepEqual([plan.chunks[0].start, plan.chunks[0].end], [0, 32]);
  assert.deepEqual(
    [plan.chunks.at(-1)?.start, plan.chunks.at(-1)?.end],
    [2_080, 2_099],
  );
  assert.ok(
    plan.chunks.every(
      ({ start, end }) =>
        end > start && end - start <= HK_VISUALIZATION_STATE_CHUNK_MAXIMUM_SIZE,
    ),
  );
  assert.equal(new Set(plan.chunks.map(({ chunkId }) => chunkId)).size, 66);
  assert.deepEqual(cell("coordinates:desktop:en:light", 2_099), plan);
});

test("every chunk receives an exact deterministic budget share whose totals reproduce the cell", () => {
  const plan = cell("cell-budget", 65);
  assert.equal(plan.chunks.length, 3);
  assert.deepEqual(
    plan.chunks.map((chunk) => chunk.budget.stateCount),
    [32, 32, 1],
  );
  assert.deepEqual(
    plan.chunks.map((chunk) => chunk.budget.rehydrationActionCount),
    [96, 96, 3],
  );
  assert.deepEqual(
    plan.chunks.map((chunk) => chunk.budget.marginMs),
    [20_000, 20_000, 20_000],
  );
  assert.equal(
    plan.budget.executionSetupMs,
    3 * HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS,
  );
  assert.deepEqual(
    plan.chunks.map((chunk) => chunk.budget.executionSetupMs),
    [120_000, 120_000, 120_000],
  );
  assert.deepEqual(
    plan.chunks.map((chunk) => chunk.nonRangeActions.length),
    [0, 0, 2],
  );
  for (const key of [
    "preflightMs",
    "executionSetupMs",
    "stateAndMandatoryAuditsMs",
    "chunkBoundaryMs",
    "rehydrationActionMs",
    "nonRangeActionMs",
    "finalResetMs",
    "marginMs",
    "totalMs",
  ] as const) {
    assert.equal(
      plan.chunks.reduce((sum, chunk) => sum + chunk.budget[key], 0),
      plan.budget[key],
      `${key} must reproduce the cell total exactly`,
    );
  }
  assert.equal(plan.chunks[0].budget.finalResetMs, 0);
  assert.equal(
    plan.chunks.at(-1)?.budget.finalResetMs,
    HK_VISUALIZATION_PROVISIONAL_FINAL_RESET_MS,
  );
  assert.ok(
    plan.chunks.every(
      (chunk) =>
        chunk.budget.chunkBoundaryMs ===
        HK_VISUALIZATION_PROVISIONAL_CHUNK_BOUNDARY_MS,
    ),
  );
});

test("chunk ids bind cellId, planHash, and exact [start,end) range", () => {
  const original = cell("cell-a", 33);
  const differentCell = cell("cell-b", 33);
  const differentPlan = buildHkVisualizationStateCellPlan({
    cellId: "cell-a",
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(3),
    resetExpectedDescriptorHash: original.resetExpectedDescriptorHash,
    resetExpectedSignature: original.resetExpectedSignature,
    states: original.states,
  });
  assert.notEqual(original.chunks[0].chunkId, differentCell.chunks[0].chunkId);
  assert.notEqual(original.chunks[0].chunkId, differentPlan.chunks[0].chunkId);
  assert.notEqual(original.chunks[0].chunkId, original.chunks[1].chunkId);
});

test("valid preflight state and ordered-control changes alter plan and execution hashes deterministically", () => {
  const original = cell("cell-a", 2);
  const reversedStates = buildHkVisualizationStateCellPlan({
    cellId: "cell-a",
    marginMs: original.marginMs,
    nonRangeActions: nonRangeInputs(original),
    resetExpectedDescriptorHash: original.resetExpectedDescriptorHash,
    resetExpectedSignature: original.resetExpectedSignature,
    states: [state(1), state(0)],
  });
  const reversedControls = buildHkVisualizationStateCellPlan({
    cellId: "cell-a",
    marginMs: original.marginMs,
    nonRangeActions: nonRangeInputs(original),
    resetExpectedDescriptorHash: original.resetExpectedDescriptorHash,
    resetExpectedSignature: original.resetExpectedSignature,
    states: [
      { ...state(0), orderedControlIds: ["y", "x"] },
      { ...state(1), orderedControlIds: ["y", "x"] },
    ],
  });
  assert.notEqual(original.planHash, reversedStates.planHash);
  assert.notEqual(original.planHash, reversedControls.planHash);
  assert.notEqual(original.cellExecutionHash, reversedStates.cellExecutionHash);
  const changedModeContext = buildHkVisualizationStateCellPlan({
    cellId: "cell-a",
    marginMs: original.marginMs,
    nonRangeActions: nonRangeInputs(original),
    resetExpectedDescriptorHash: original.resetExpectedDescriptorHash,
    resetExpectedSignature: original.resetExpectedSignature,
    states: [
      {
        ...state(0),
        modeContext: [
          {
            ...state(0).modeContext[0],
            replaySelector: '[data-viz-mode-id="graph-v2"]',
          },
        ],
        rehydrationActions: state(0).rehydrationActions.map((action, index) =>
          index === 0
            ? { ...action, selector: '[data-viz-mode-id="graph-v2"]' }
            : action,
        ),
      },
      state(1),
    ],
  });
  const changedAction = buildHkVisualizationStateCellPlan({
    cellId: "cell-a",
    marginMs: original.marginMs,
    nonRangeActions: nonRangeInputs(original),
    resetExpectedDescriptorHash: original.resetExpectedDescriptorHash,
    resetExpectedSignature: original.resetExpectedSignature,
    states: [
      {
        ...state(0),
        rehydrationActions: state(0).rehydrationActions.map((action, index) =>
          index === 1 ? { ...action, requestedValue: 99 } : action,
        ),
      },
      state(1),
    ],
  });
  assert.notEqual(original.planHash, changedModeContext.planHash);
  assert.notEqual(original.planHash, changedAction.planHash);
  assert.deepEqual(cell("cell-a", 2), original);
});

test("preflight validates exact ordered ids, reasons, descriptor hashes, uniqueness, and non-empty plans", () => {
  const fixture = state(0);
  assert.throws(
    () =>
      buildHkVisualizationStateCellPlan({
        cellId: "empty",
        marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
        nonRangeActions: nonRangeActionPlan(0),
        resetExpectedDescriptorHash: fixture.descriptorHash,
        resetExpectedSignature: fixture.startingSignature,
        states: [],
      }),
    /at least one executable state/,
  );
  assert.throws(
    () =>
      buildHkVisualizationStateCellPlan({
        cellId: "duplicate",
        marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
        nonRangeActions: nonRangeActionPlan(0),
        resetExpectedDescriptorHash: fixture.descriptorHash,
        resetExpectedSignature: fixture.startingSignature,
        states: [fixture, fixture],
      }),
    /duplicated/,
  );
  assert.throws(
    () =>
      buildHkVisualizationStateCellPlan({
        cellId: "bad-controls",
        marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
        nonRangeActions: nonRangeActionPlan(0),
        resetExpectedDescriptorHash: fixture.descriptorHash,
        resetExpectedSignature: fixture.startingSignature,
        states: [{ ...fixture, orderedControlIds: ["x", "x"] }],
      }),
    /orderedControlIds contains a duplicate/,
  );
  assert.throws(
    () =>
      buildHkVisualizationStateCellPlan({
        cellId: "bad-reasons",
        marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
        nonRangeActions: nonRangeActionPlan(0),
        resetExpectedDescriptorHash: fixture.descriptorHash,
        resetExpectedSignature: fixture.startingSignature,
        states: [{ ...fixture, reasons: [] }],
      }),
    /at least one reason/,
  );
  assert.throws(
    () =>
      buildHkVisualizationStateCellPlan({
        cellId: "bad-hash",
        marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
        nonRangeActions: nonRangeActionPlan(0),
        resetExpectedDescriptorHash: fixture.descriptorHash,
        resetExpectedSignature: fixture.startingSignature,
        states: [{ ...fixture, descriptorHash: "not-a-hash" }],
      }),
    /SHA-256/,
  );
  for (const signatureField of [
    "actionSignature",
    "expectedSignature",
    "requestedSignature",
    "startingSignature",
  ] as const) {
    assert.throws(
      () =>
        buildHkVisualizationStateCellPlan({
          cellId: `blank-${signatureField}`,
          marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
          nonRangeActions: nonRangeActionPlan(0),
          resetExpectedDescriptorHash: fixture.descriptorHash,
          resetExpectedSignature: fixture.startingSignature,
          states: [{ ...fixture, [signatureField]: "   " }],
        }),
      new RegExp(signatureField),
    );
  }
  assert.throws(
    () =>
      buildHkVisualizationStateCellPlan({
        cellId: "blank-reset-signature",
        marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
        nonRangeActions: nonRangeActionPlan(0),
        resetExpectedDescriptorHash: fixture.descriptorHash,
        resetExpectedSignature: "   ",
        states: [fixture],
      }),
    /resetExpectedSignature/,
  );
});

test("preflight mode context and rehydration actions are exact, ordered, unique, and dependency-safe", () => {
  const fixture = state(0);
  const ownerAction = fixture.rehydrationActions[0];
  const dependentAction = {
    actionId: "mode:tool:ruler",
    actionKind: "activate-mode" as const,
    controlId: null,
    expectedValue: "ruler",
    projectedAbsence: null,
    requestedValue: "ruler",
    selector: '[data-viz-mode-id="ruler"]',
    targetPolicy: "required-interactive" as const,
  };
  const dependent = {
    activeModeId: "ruler",
    dependsOnGroupId: "view",
    groupId: "tool",
    replayActionId: dependentAction.actionId,
    replaySelector: dependentAction.selector,
  };
  const valid = buildHkVisualizationStateCellPlan({
    cellId: "mode-topology",
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(0),
    resetExpectedDescriptorHash: fixture.descriptorHash,
    resetExpectedSignature: fixture.startingSignature,
    states: [
      {
        ...fixture,
        modeContext: [...fixture.modeContext, dependent],
        rehydrationActions: [
          ownerAction,
          dependentAction,
          ...fixture.rehydrationActions.slice(1),
        ],
      },
    ],
  });
  assert.equal(valid.states[0].modeContext[1].dependsOnGroupId, "view");
  assert.match(valid.states[0].modeContextHash, /^[0-9a-f]{64}$/);
  assert.match(valid.states[0].rehydrationActionsHash, /^[0-9a-f]{64}$/);

  const invalidMutations = [
    {
      label: "missing mode context",
      state: { ...fixture, modeContext: undefined },
      pattern: /modeContext must be an array/,
    },
    {
      label: "missing rehydration actions",
      state: { ...fixture, rehydrationActions: undefined },
      pattern: /rehydrationActions must be an array/,
    },
    {
      label: "non-empty group",
      state: {
        ...fixture,
        modeContext: [{ ...fixture.modeContext[0], groupId: "" }],
      },
      pattern: /groupId.*non-empty/,
    },
    {
      label: "unique group",
      state: {
        ...fixture,
        modeContext: [fixture.modeContext[0], fixture.modeContext[0]],
      },
      pattern: /mode group view is duplicated/,
    },
    {
      label: "missing dependency owner",
      state: {
        ...fixture,
        modeContext: [
          { ...fixture.modeContext[0], dependsOnGroupId: "missing" },
        ],
      },
      pattern: /dependency.*missing|must precede/,
    },
    {
      label: "ordered dependency",
      state: {
        ...fixture,
        modeContext: [dependent, fixture.modeContext[0]],
        rehydrationActions: [dependentAction, ...fixture.rehydrationActions],
      },
      pattern: /dependency.*view.*must precede/,
    },
    {
      label: "unique action",
      state: { ...fixture, rehydrationActions: [ownerAction, ownerAction] },
      pattern: /rehydration action.*duplicated/,
    },
    {
      label: "missing replay action",
      state: {
        ...fixture,
        modeContext: [
          { ...fixture.modeContext[0], replayActionId: "missing-action" },
        ],
      },
      pattern: /replayActionId.*missing-action|no matching rehydration action/,
    },
    {
      label: "wrong replay selector",
      state: {
        ...fixture,
        modeContext: [{ ...fixture.modeContext[0], replaySelector: "#wrong" }],
      },
      pattern: /replay selector/,
    },
    {
      label: "wrong replay action identity",
      state: {
        ...fixture,
        rehydrationActions: [
          { ...ownerAction, actionKind: "set-range-value" as const },
          ...fixture.rehydrationActions.slice(1),
        ],
      },
      pattern: /activate-mode|controlId/,
    },
  ] as const;
  for (const invalid of invalidMutations) {
    assert.throws(
      () =>
        buildHkVisualizationStateCellPlan({
          cellId: invalid.label,
          marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
          nonRangeActions: nonRangeActionPlan(0),
          resetExpectedDescriptorHash: fixture.descriptorHash,
          resetExpectedSignature: fixture.startingSignature,
          states: [invalid.state as HkVisualizationPreflightCellStateInput],
        }),
      invalid.pattern,
    );
  }
});

test("projected range absence remains an explicit dependent action with exact earlier-controller metadata", () => {
  const fixture = state(0);
  const [modeAction, controllerAction, rawDependentAction] =
    fixture.rehydrationActions;
  const projectedAbsence = {
    controllerActionId: controllerAction.actionId,
    fixedNodeSelector: '[data-viz-fixed-parameter="y"]',
    fixedValue: rawDependentAction.expectedValue,
    projection: "clamp-and-visibility" as const,
    reason:
      "The x controller clamps y and replaces its slider with one fixed node.",
  };
  const dependentAction = {
    ...rawDependentAction,
    projectedAbsence,
    targetPolicy: "projected-fixed-node" as const,
  };
  const build = (rehydrationActions: readonly unknown[]) =>
    buildHkVisualizationStateCellPlan({
      cellId: "projected-absence",
      marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
      nonRangeActions: nonRangeActionPlan(0),
      resetExpectedDescriptorHash: fixture.descriptorHash,
      resetExpectedSignature: fixture.startingSignature,
      states: [
        {
          ...fixture,
          rehydrationActions:
            rehydrationActions as HkVisualizationPreflightCellStateInput["rehydrationActions"],
        },
      ],
    });

  const valid = build([modeAction, controllerAction, dependentAction]);
  assert.equal(valid.states[0].rehydrationActions.length, 3);
  assert.equal(valid.states[0].rehydrationActions[2].controlId, "y");
  assert.deepEqual(
    valid.states[0].rehydrationActions[2].projectedAbsence,
    projectedAbsence,
  );
  assert.equal(valid.budget.rehydrationActionCount, 3);

  const invalidCases = [
    {
      actions: [
        modeAction,
        controllerAction,
        { ...dependentAction, projectedAbsence: null },
      ],
      pattern: /projected-fixed-node.*metadata/,
    },
    {
      actions: [
        modeAction,
        controllerAction,
        {
          ...rawDependentAction,
          projectedAbsence,
          targetPolicy: "required-interactive",
        },
      ],
      pattern: /required-interactive.*null metadata/,
    },
    {
      actions: [
        modeAction,
        controllerAction,
        {
          ...dependentAction,
          projectedAbsence: {
            ...projectedAbsence,
            controllerActionId: "missing-controller",
          },
        },
      ],
      pattern: /earlier controller action/,
    },
    {
      actions: [modeAction, dependentAction, controllerAction],
      pattern: /earlier controller action/,
    },
    {
      actions: [
        modeAction,
        controllerAction,
        {
          ...dependentAction,
          projectedAbsence: { ...projectedAbsence, fixedValue: 999 },
        },
      ],
      pattern: /fixedValue.*expectedValue/,
    },
    {
      actions: [
        modeAction,
        controllerAction,
        {
          ...dependentAction,
          projectedAbsence: {
            ...projectedAbsence,
            fixedNodeSelector: " ",
          },
        },
      ],
      pattern: /fixedNodeSelector/,
    },
    {
      actions: [
        modeAction,
        controllerAction,
        {
          ...dependentAction,
          projectedAbsence: { ...projectedAbsence, reason: "" },
        },
      ],
      pattern: /reason/,
    },
    {
      actions: [
        modeAction,
        controllerAction,
        {
          ...dependentAction,
          projectedAbsence: {
            ...projectedAbsence,
            projection: "hide-and-trust",
          },
        },
      ],
      pattern: /projection.*clamp-and-visibility/,
    },
    {
      actions: [
        modeAction,
        controllerAction,
        {
          ...dependentAction,
          projectedAbsence: {
            ...projectedAbsence,
            controllerActionId: modeAction.actionId,
          },
        },
      ],
      pattern: /earlier controller action.*set-range-value/,
    },
    {
      actions: [
        modeAction,
        controllerAction,
        {
          ...dependentAction,
          projectedAbsence: {
            ...projectedAbsence,
            staleUnknownFlag: true,
          },
        },
      ],
      pattern: /projectedAbsence.*exactly/,
    },
    {
      actions: [modeAction, controllerAction],
      pattern: /ordered control y.*exactly one set-range-value action/,
    },
  ];
  for (const invalid of invalidCases) {
    assert.throws(() => build(invalid.actions), invalid.pattern);
  }
});

test("non-range actions are canonical, unique, immutable, hashed, and assigned exactly to the final chunk", () => {
  const plan = cell("non-range-plan", 33);
  assert.equal(plan.nonRangeActions.length, 2);
  assert.ok(Object.isFrozen(plan.nonRangeActions));
  assert.ok(plan.nonRangeActions.every((action) => Object.isFrozen(action)));
  assert.ok(
    plan.nonRangeActions.every((action) =>
      /^[0-9a-f]{64}$/.test(action.inputHash),
    ),
  );
  assert.deepEqual(plan.chunks[0].nonRangeActions, []);
  assert.deepEqual(plan.chunks[1].nonRangeActions, plan.nonRangeActions);
  assert.equal(plan.chunks[0].budget.nonRangeActionCount, 0);
  assert.equal(plan.chunks[1].budget.nonRangeActionCount, 2);

  const base = nonRangeActionPlan(1)[0];
  const build = (nonRangeActions: readonly unknown[]) =>
    buildHkVisualizationStateCellPlan({
      cellId: "non-range-validation",
      marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
      nonRangeActions:
        nonRangeActions as readonly HkVisualizationNonRangeActionInput[],
      resetExpectedDescriptorHash: hashHkVisualizationDescriptor({
        reset: true,
      }),
      resetExpectedSignature: "reset-signature",
      states: [state(0)],
    });
  const invalidCases = [
    { actions: [base, base], pattern: /non-range action.*duplicated/ },
    { actions: [{ ...base, actionId: "" }], pattern: /actionId/ },
    { actions: [{ ...base, actionKind: "hover" }], pattern: /actionKind/ },
    { actions: [{ ...base, selector: "" }], pattern: /selector/ },
    { actions: [{ ...base, targetId: "" }], pattern: /targetId/ },
    {
      actions: [{ ...base, expectedOutcome: "trust-me" }],
      pattern: /expectedOutcome/,
    },
    {
      actions: [{ ...base, actionKind: "set-value", requestedValue: null }],
      pattern: /set-value.*requestedValue/,
    },
    {
      actions: [{ ...base, actionKind: "click", requestedValue: "forged" }],
      pattern: /click.*requestedValue.*null/,
    },
    {
      actions: [{ ...base, skipReceipt: true }],
      pattern: /nonRangeActions\[0\].*exactly/,
    },
  ];
  for (const invalid of invalidCases) {
    assert.throws(() => build(invalid.actions), invalid.pattern);
  }
  const changed = build([{ ...base, selector: "#changed" }]);
  const original = build([base]);
  assert.notEqual(changed.planHash, original.planHash);
  assert.notEqual(changed.cellExecutionHash, original.cellExecutionHash);
  assert.notEqual(
    changed.chunks.at(-1)?.chunkId,
    original.chunks.at(-1)?.chunkId,
  );
});

test("keyboard-adjust actions serialize canonically and retain exact key order in every hash boundary", () => {
  const plan = buildNonRangeActionCell(
    "keyboard-adjust-order",
    keyboardAdjustActionPlan(),
  );
  const rebuilt = buildNonRangeActionCell(
    "keyboard-adjust-order",
    keyboardAdjustActionPlan(),
  );
  assert.deepEqual(
    plan.nonRangeActions.map(({ actionKind, index, requestedValue }) => ({
      actionKind,
      index,
      requestedValue,
    })),
    KEYBOARD_ADJUST_KEYS.map((requestedValue, index) => ({
      actionKind: "keyboard-adjust",
      index,
      requestedValue,
    })),
  );
  assert.ok(Object.isFrozen(plan.nonRangeActions));
  assert.ok(plan.nonRangeActions.every((action) => Object.isFrozen(action)));
  assert.ok(
    plan.nonRangeActions.every((action) =>
      /^[0-9a-f]{64}$/.test(action.inputHash),
    ),
  );
  const serialized = canonicalHkVisualizationJson(plan.nonRangeActions);
  assert.deepEqual(JSON.parse(serialized), plan.nonRangeActions);
  assert.equal(
    serialized,
    canonicalHkVisualizationJson(rebuilt.nonRangeActions),
  );
  assert.deepEqual(
    plan.nonRangeActions.map(({ inputHash }) => inputHash),
    rebuilt.nonRangeActions.map(({ inputHash }) => inputHash),
  );
  assert.equal(plan.nonRangeActionsHash, rebuilt.nonRangeActionsHash);
  assert.equal(plan.planHash, rebuilt.planHash);
  assert.equal(plan.cellExecutionHash, rebuilt.cellExecutionHash);

  const reordered = buildNonRangeActionCell(
    "keyboard-adjust-order",
    keyboardAdjustActionPlan([...KEYBOARD_ADJUST_KEYS].reverse()),
  );
  assert.deepEqual(
    reordered.nonRangeActions.map(({ requestedValue }) => requestedValue),
    [...KEYBOARD_ADJUST_KEYS].reverse(),
  );
  assert.notDeepEqual(
    reordered.nonRangeActions.map(({ inputHash }) => inputHash),
    plan.nonRangeActions.map(({ inputHash }) => inputHash),
  );
  assert.notEqual(reordered.nonRangeActionsHash, plan.nonRangeActionsHash);
  assert.notEqual(reordered.planHash, plan.planHash);
  assert.notEqual(reordered.cellExecutionHash, plan.cellExecutionHash);
});

test("keyboard-adjust rejects every non-contract key, missing selectors, and duplicate action identities", () => {
  const invalidRequestedValues = [
    "ArrowLeft",
    "ArrowDown",
    "PageUp",
    "PageDown",
    "Enter",
    "Space",
    "Escape",
    "Tab",
    "",
    0,
    null,
  ] as const;
  for (const requestedValue of invalidRequestedValues) {
    assert.throws(
      () =>
        buildNonRangeActionCell(
          `keyboard-adjust-invalid-${String(requestedValue)}`,
          keyboardAdjustActionPlan([requestedValue]),
        ),
      /keyboard-adjust requestedValue must be ArrowRight, ArrowUp, Home, or End/,
    );
  }

  const base = keyboardAdjustActionPlan(["ArrowRight"])[0];
  const { selector: _selector, ...withoutSelector } = base;
  assert.throws(
    () =>
      buildNonRangeActionCell("keyboard-adjust-missing-selector", [
        withoutSelector as HkVisualizationNonRangeActionInput,
      ]),
    /nonRangeActions\[0\].*exactly.*selector/,
  );
  assert.throws(
    () =>
      buildNonRangeActionCell("keyboard-adjust-blank-selector", [
        { ...base, selector: "   " },
      ]),
    /selector.*non-empty string/,
  );
  assert.throws(
    () =>
      buildNonRangeActionCell("keyboard-adjust-duplicate", [
        base,
        { ...base, requestedValue: "ArrowUp" },
      ]),
    /non-range action.*duplicated/,
  );
});

test("keyboard-adjust receipts reject reordered execution and input-hash drift", () => {
  const plan = buildNonRangeActionCell(
    "keyboard-adjust-receipts",
    keyboardAdjustActionPlan(),
  );

  const reordered = clone(passingReceipts([plan]));
  [
    reordered[0].nonRangeActionReceipts[0],
    reordered[0].nonRangeActionReceipts[1],
  ] = [
    reordered[0].nonRangeActionReceipts[1],
    reordered[0].nonRangeActionReceipts[0],
  ];
  assert.throws(
    () => validate([plan], reordered),
    /non-range actionId|out of order/,
  );

  const hashDrift = clone(passingReceipts([plan]));
  hashDrift[0].nonRangeActionReceipts[2].inputHash =
    sha256HkVisualizationCanonical({
      actionKind: "keyboard-adjust",
      requestedValue: "ArrowRight",
    });
  assert.throws(
    () => validate([plan], hashDrift),
    /wrong non-range input hash/,
  );
});

test("exact ordered receipts yield immutable zero-failure aggregate evidence only", () => {
  const plans = [cell("cell-a", 35), cell("cell-b", 2)] as const;
  const receipts = passingReceipts(plans);
  const evidence = validate(plans, receipts);
  assert.deepEqual(
    {
      cellCount: evidence.cellCount,
      chunkCount: evidence.chunkCount,
      failureCount: evidence.failureCount,
      finalResetCount: evidence.finalResetCount,
      nonRangeActionCount: evidence.nonRangeActionCount,
      retryCount: evidence.retryCount,
      skippedCount: evidence.skippedCount,
      scrollObservationCount: evidence.scrollObservationCount,
      scrollObservationSetCount: evidence.scrollObservationSetCount,
      scrollPositionAuditCount: evidence.scrollPositionAuditCount,
      stateCount: evidence.stateCount,
      status: evidence.status,
      zeroFailures: evidence.zeroFailures,
    },
    {
      cellCount: 2,
      chunkCount: 3,
      failureCount: 0,
      finalResetCount: 2,
      nonRangeActionCount: 4,
      retryCount: 0,
      skippedCount: 0,
      scrollObservationCount: 43,
      scrollObservationSetCount: 43,
      scrollPositionAuditCount: 258,
      stateCount: 37,
      status: "passed",
      zeroFailures: true,
    },
  );
  assert.equal(evidence.mandatoryAuditCount, 43 + 43 * 6);
  assert.equal(
    evidence.auditedExecutionMs,
    43 * calculateHkVisualizationAuditedExecutionMs(1),
  );
  assert.match(evidence.aggregateHash, /^[0-9a-f]{64}$/);
  assert.deepEqual(validate(plans, receipts), evidence);
  assert.ok(Object.isFrozen(evidence));
});

test("exact ordered non-range receipts prove every planned action and outcome", () => {
  const plan = buildHkVisualizationStateCellPlan({
    cellId: "all-non-range-outcomes",
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(4),
    resetExpectedDescriptorHash: hashHkVisualizationDescriptor({ reset: true }),
    resetExpectedSignature: "reset-signature",
    states: [state(0)],
  });
  const evidence = validate([plan], passingReceipts([plan]));
  assert.equal(evidence.nonRangeActionCount, 4);
  assert.equal(evidence.mandatoryAuditCount, 6 + 6 * 6);
});

test("non-range receipts reject missing, extra, duplicate, and reordered actions", () => {
  const plans = [cell("cell-a", 33)] as const;
  const finalChunkIndex = 1;
  const receipts = passingReceipts(plans);
  const missing = clone(receipts);
  missing[finalChunkIndex].nonRangeActionReceipts.pop();
  assert.throws(
    () => validate(plans, missing),
    /missing a non-range action receipt/,
  );

  const extra = clone(receipts);
  const extraReceipt = clone(extra[finalChunkIndex].nonRangeActionReceipts[0]);
  extraReceipt.actionId = "extra-non-range";
  extra[finalChunkIndex].nonRangeActionReceipts.push(extraReceipt);
  assert.throws(() => validate(plans, extra), /extra non-range action receipt/);

  const duplicate = clone(receipts);
  duplicate[finalChunkIndex].nonRangeActionReceipts[1] = clone(
    duplicate[finalChunkIndex].nonRangeActionReceipts[0],
  );
  assert.throws(() => validate(plans, duplicate), /duplicate non-range action/);

  const reordered = clone(receipts);
  reordered[finalChunkIndex].nonRangeActionReceipts.reverse();
  assert.throws(
    () => validate(plans, reordered),
    /non-range actionId|out of order/,
  );

  const premature = clone(receipts);
  premature[0].nonRangeActionReceipts = clone(
    premature[finalChunkIndex].nonRangeActionReceipts,
  );
  assert.throws(
    () => validate(plans, premature),
    /extra non-range action receipt/,
  );
});

test("non-range receipts reject forged identity, signatures, outcomes, status, retries, and audits", () => {
  const plans = [cell("cell-a", 1)] as const;
  const mutations: Array<{
    mutate: (receipt: any) => void;
    pattern: RegExp;
  }> = [
    { mutate: (receipt) => (receipt.actionId = "wrong"), pattern: /actionId/ },
    { mutate: (receipt) => (receipt.actionIndex = 99), pattern: /actionIndex/ },
    {
      mutate: (receipt) =>
        (receipt.inputHash = sha256HkVisualizationCanonical({ wrong: true })),
      pattern: /input hash/,
    },
    {
      mutate: (receipt) => (receipt.actionKind = "focus"),
      pattern: /actionKind/,
    },
    {
      mutate: (receipt) => (receipt.expectedOutcome = "exact-no-change"),
      pattern: /expected outcome policy/,
    },
    {
      mutate: (receipt) => (receipt.beforeSignature = ""),
      pattern: /beforeSignature/,
    },
    {
      mutate: (receipt) => (receipt.afterSignature = ""),
      pattern: /afterSignature/,
    },
    {
      mutate: (receipt) => (receipt.afterSignature = receipt.beforeSignature),
      pattern: /state-change.*different signatures/,
    },
    {
      mutate: (receipt) => (receipt.contractStateChanged = false),
      pattern: /state-change.*contractStateChanged/,
    },
    {
      mutate: (receipt) => (receipt.status = "skipped"),
      pattern: /did not pass/,
    },
    {
      mutate: (receipt) => (receipt.status = "failed"),
      pattern: /did not pass/,
    },
    { mutate: (receipt) => (receipt.failure = "failed"), pattern: /failure/ },
    { mutate: (receipt) => (receipt.retryCount = 1), pattern: /retry/ },
    {
      mutate: (receipt) => delete receipt.audits.math,
      pattern: /exactly every mandatory audit/,
    },
  ];
  for (const { mutate, pattern } of mutations) {
    const receipts = clone(passingReceipts(plans));
    mutate(receipts[0].nonRangeActionReceipts[0]);
    assert.throws(() => validate(plans, receipts), pattern);
  }

  const secondAction = clone(passingReceipts(plans));
  secondAction[0].nonRangeActionReceipts[1].focusActivated = false;
  assert.throws(() => validate(plans, secondAction), /focus-activate/);

  const allPoliciesPlan = buildHkVisualizationStateCellPlan({
    cellId: "all-policy-negatives",
    marginMs: HK_VISUALIZATION_PROVISIONAL_MARGIN_MS,
    nonRangeActions: nonRangeActionPlan(4),
    resetExpectedDescriptorHash: hashHkVisualizationDescriptor({ reset: true }),
    resetExpectedSignature: "reset-signature",
    states: [state(0)],
  });
  const meaningfulSignature = clone(passingReceipts([allPoliciesPlan]));
  meaningfulSignature[0].nonRangeActionReceipts[2].afterSignature =
    meaningfulSignature[0].nonRangeActionReceipts[2].beforeSignature;
  assert.throws(
    () => validate([allPoliciesPlan], meaningfulSignature),
    /meaningful-change.*different signatures/,
  );
  const meaningfulBoolean = clone(passingReceipts([allPoliciesPlan]));
  meaningfulBoolean[0].nonRangeActionReceipts[2].meaningfulEvidenceChanged = false;
  assert.throws(
    () => validate([allPoliciesPlan], meaningfulBoolean),
    /meaningful-change.*meaningfulEvidenceChanged/,
  );
  const exactSignature = clone(passingReceipts([allPoliciesPlan]));
  exactSignature[0].nonRangeActionReceipts[3].afterSignature = "changed";
  assert.throws(
    () => validate([allPoliciesPlan], exactSignature),
    /exact-no-change.*identical signatures/,
  );
  const exactBoolean = clone(passingReceipts([allPoliciesPlan]));
  exactBoolean[0].nonRangeActionReceipts[3].contractStateChanged = true;
  assert.throws(
    () => validate([allPoliciesPlan], exactBoolean),
    /exact-no-change.*change claims/,
  );
});

test("aggregate requires a caller-supplied non-empty exact cell manifest", () => {
  assert.throws(() => validate([], []), /expectedCells/);
  const duplicate = cell("duplicate-cell", 1);
  assert.throws(
    () =>
      validate([duplicate, duplicate], passingReceipts([duplicate, duplicate])),
    /expected cell duplicate-cell is duplicated/,
  );
});

test("missing and extra cells fail closed", () => {
  const plans = [cell("cell-a", 1), cell("cell-b", 1)] as const;
  const receipts = passingReceipts(plans);
  assert.throws(
    () =>
      validate(
        plans,
        receipts.filter(({ cellId }) => cellId !== "cell-b"),
      ),
    /missing expected cell/,
  );
  const extra = clone(receipts[0]);
  extra.cellId = "cell-extra";
  extra.chunkId = sha256HkVisualizationCanonical({ extra: true });
  assert.throws(() => validate(plans, [...receipts, extra]), /extra cell/);
});

test("missing, extra, and duplicate chunks fail closed", () => {
  const plans = [cell("cell-a", 33)] as const;
  const receipts = passingReceipts(plans);
  assert.throws(
    () => validate(plans, receipts.slice(0, 1)),
    /missing an expected chunk|chunks do not cover/,
  );
  const extra = clone(receipts[1]);
  extra.chunkId = sha256HkVisualizationCanonical({ extra: "chunk" });
  assert.throws(() => validate(plans, [...receipts, extra]), /extra chunk/);
  assert.throws(
    () => validate(plans, [...receipts, receipts[1]]),
    /duplicated/,
  );
});

test("out-of-order chunks and cells fail closed", () => {
  const oneCell = [cell("cell-a", 33)] as const;
  const oneCellReceipts = passingReceipts(oneCell);
  assert.throws(
    () => validate(oneCell, [oneCellReceipts[1], oneCellReceipts[0]]),
    /gap|overlap|out of order/,
  );
  const twoCells = [cell("cell-a", 1), cell("cell-b", 1)] as const;
  const twoCellReceipts = passingReceipts(twoCells);
  assert.throws(
    () => validate(twoCells, [twoCellReceipts[1], twoCellReceipts[0]]),
    /aggregate index|out of order/,
  );
});

test("chunk gaps, overlaps, reversed ranges, and oversize ranges fail closed", () => {
  const plans = [cell("cell-a", 33)] as const;
  const receipts = passingReceipts(plans);
  const gap = clone(receipts);
  gap[1].start = 33;
  gap[1].end = 34;
  assert.throws(() => validate(plans, gap), /gap/);
  const overlap = clone(receipts);
  overlap[1].start = 31;
  assert.throws(() => validate(plans, overlap), /overlap/);
  const reversed = clone(receipts);
  reversed[0].end = 0;
  assert.throws(() => validate(plans, reversed), /empty or reversed/);
  const oversize = clone(receipts);
  oversize[0].end = 33;
  assert.throws(() => validate(plans, oversize), /larger than 32/);
});

test("wrong run, build, audit, plan, and cell execution hashes fail closed", () => {
  const plans = [cell("cell-a", 1)] as const;
  const cases = [
    ["runId", "wrong-run", /runId/],
    ["buildId", "wrong-build", /buildId/],
    [
      "auditHash",
      sha256HkVisualizationCanonical({ wrong: "audit" }),
      /auditHash/,
    ],
    ["planHash", sha256HkVisualizationCanonical({ wrong: "plan" }), /planHash/],
    [
      "cellExecutionHash",
      sha256HkVisualizationCanonical({ wrong: "execution" }),
      /cellExecutionHash/,
    ],
  ] as const;
  for (const [key, value, pattern] of cases) {
    const receipts = clone(passingReceipts(plans));
    receipts[0][key] = value;
    assert.throws(() => validate(plans, receipts), pattern);
  }
});

test("lowercase SHA-256 build, run, and matrix manifest bindings are exact on every receipt and aggregate", () => {
  const plans = [cell("cell-a", 1)] as const;
  const validEvidence = validate(plans, passingReceipts(plans));
  assert.equal(validEvidence.buildHash, BUILD_HASH);
  assert.equal(
    validEvidence.matrixManifestHash,
    hashHkVisualizationMatrixManifest(plans),
  );
  assert.match(validEvidence.runHash, /^[0-9a-f]{64}$/);

  for (const key of ["buildHash", "runHash", "matrixManifestHash"] as const) {
    const wrong = clone(passingReceipts(plans));
    wrong[0][key] = sha256HkVisualizationCanonical({ wrong: key });
    assert.throws(() => validate(plans, wrong), new RegExp(key));
    const malformed = clone(passingReceipts(plans));
    malformed[0][key] = "ABC";
    assert.throws(() => validate(plans, malformed), /lowercase SHA-256/);
  }

  const matrixManifestHash = hashHkVisualizationMatrixManifest(plans);
  assert.throws(
    () =>
      validateHkVisualizationStateChunkReceipts({
        auditHash: AUDIT_HASH,
        buildHash: BUILD_HASH,
        buildId: BUILD_ID,
        expectedCells: plans,
        matrixManifestHash,
        receipts: passingReceipts(plans),
        runHash: sha256HkVisualizationCanonical({ forged: "run" }),
        runId: RUN_ID,
      }),
    /runHash.*binding/,
  );
  assert.throws(
    () =>
      validateHkVisualizationStateChunkReceipts({
        auditHash: AUDIT_HASH,
        buildHash: BUILD_HASH,
        buildId: BUILD_ID,
        expectedCells: plans,
        matrixManifestHash: sha256HkVisualizationCanonical({ wrong: "matrix" }),
        receipts: passingReceipts(plans),
        runHash: deriveHkVisualizationRunHash({
          auditHash: AUDIT_HASH,
          buildHash: BUILD_HASH,
          buildId: BUILD_ID,
          matrixManifestHash: sha256HkVisualizationCanonical({
            wrong: "matrix",
          }),
          runId: RUN_ID,
        }),
        runId: RUN_ID,
      }),
    /matrixManifestHash.*exact expected cell manifest/,
  );
});

test("tampered expected plan hashes, chunks, budgets, or state order fail before receipt acceptance", () => {
  const plan = clone(cell("cell-a", 2));
  plan.planHash = sha256HkVisualizationCanonical({ tampered: "plan" });
  assert.throws(
    () => validate([plan], passingReceipts([cell("cell-a", 2)])),
    /internally consistent/,
  );
  const reordered = clone(cell("cell-a", 2));
  reordered.states.reverse();
  assert.throws(
    () => validate([reordered], passingReceipts([cell("cell-a", 2)])),
    /internally consistent/,
  );
  const oneMillisecondCellDrift = clone(cell("cell-a", 2));
  oneMillisecondCellDrift.budget.totalMs += 1;
  assert.throws(
    () =>
      validate([oneMillisecondCellDrift], passingReceipts([cell("cell-a", 2)])),
    /internally consistent/,
  );
  const oneMillisecondChunkDrift = clone(cell("cell-a", 33));
  oneMillisecondChunkDrift.chunks[0].budget.marginMs += 1;
  oneMillisecondChunkDrift.chunks[0].budget.totalMs += 1;
  assert.throws(
    () =>
      validate(
        [oneMillisecondChunkDrift],
        passingReceipts([cell("cell-a", 33)]),
      ),
    /internally consistent/,
  );
  const oneSetupReserveForTwoChunks = clone(cell("cell-a", 33));
  oneSetupReserveForTwoChunks.budget.executionSetupMs =
    HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS;
  oneSetupReserveForTwoChunks.budget.totalMs -=
    HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS;
  oneSetupReserveForTwoChunks.chunks[1].budget.executionSetupMs = 0;
  oneSetupReserveForTwoChunks.chunks[1].budget.totalMs -=
    HK_VISUALIZATION_PROVISIONAL_EXECUTION_SETUP_MS;
  assert.throws(
    () =>
      validate(
        [oneSetupReserveForTwoChunks],
        passingReceipts([cell("cell-a", 33)]),
      ),
    /internally consistent/,
  );
  const claimedNonRangeCountWithoutReceipt = clone(cell("cell-a", 1));
  claimedNonRangeCountWithoutReceipt.budget.nonRangeActionCount += 1;
  assert.throws(
    () =>
      validate(
        [claimedNonRangeCountWithoutReceipt],
        passingReceipts([cell("cell-a", 1)]),
      ),
    /internally consistent/,
  );
});

test("wrong expected or observed signatures and hashes fail closed", () => {
  const plans = [cell("cell-a", 1)] as const;
  const cases = [
    ["expectedSignature", "x=wrong", /expected signature/],
    ["observedSignature", "x=wrong", /observed signature/],
    [
      "expectedSignatureHash",
      sha256HkVisualizationCanonical({ wrong: "expected" }),
      /expected signature hash/,
    ],
    [
      "observedSignatureHash",
      sha256HkVisualizationCanonical({ wrong: "observed" }),
      /observed signature hash/,
    ],
  ] as const;
  for (const [key, value, pattern] of cases) {
    const receipts = clone(passingReceipts(plans));
    receipts[0].stateReceipts[0][key] = value;
    assert.throws(() => validate(plans, receipts), pattern);
  }
});

test("wrong expected or observed descriptor hashes fail closed", () => {
  const plans = [cell("cell-a", 1)] as const;
  for (const key of [
    "expectedDescriptorHash",
    "observedDescriptorHash",
  ] as const) {
    const receipts = clone(passingReceipts(plans));
    receipts[0].stateReceipts[0][key] = sha256HkVisualizationCanonical({
      wrong: key,
    });
    assert.throws(() => validate(plans, receipts), /descriptor hash/);
  }
  const coordinatedDrift = clone(passingReceipts(plans));
  const driftedDescriptorHash = hashHkVisualizationDescriptor({
    controls: [{ controlId: "x", maximum: 101, minimum: 0, step: 1 }],
  });
  coordinatedDrift[0].stateReceipts[0].expectedDescriptorHash =
    driftedDescriptorHash;
  coordinatedDrift[0].stateReceipts[0].observedDescriptorHash =
    driftedDescriptorHash;
  assert.throws(() => validate(plans, coordinatedDrift), /descriptor hash/);
});

test("wrong state id, index, input hash, mode, and domain fail closed", () => {
  const plans = [cell("cell-a", 1)] as const;
  const cases = [
    ["stateId", "wrong-state", /stateId/],
    ["stateIndex", 99, /stateIndex/],
    [
      "inputHash",
      sha256HkVisualizationCanonical({ wrong: "input" }),
      /input hash/,
    ],
    ["modeId", "wrong-mode", /modeId/],
    ["domainId", "wrong-domain", /domainId/],
  ] as const;
  for (const [key, value, pattern] of cases) {
    const receipts = clone(passingReceipts(plans));
    receipts[0].stateReceipts[0][key] = value;
    assert.throws(() => validate(plans, receipts), pattern);
  }
});

test("state receipts bind the exact mode context and rehydration action plan", () => {
  const plans = [cell("cell-a", 1)] as const;
  for (const [key, pattern] of [
    ["modeContextHash", /mode context hash/],
    ["rehydrationActionsHash", /rehydration actions hash/],
  ] as const) {
    const wrong = clone(passingReceipts(plans));
    wrong[0].stateReceipts[0][key] = sha256HkVisualizationCanonical({
      wrong: key,
    });
    assert.throws(() => validate(plans, wrong), pattern);
    const missing = clone(passingReceipts(plans));
    delete missing[0].stateReceipts[0][key];
    assert.throws(() => validate(plans, missing), pattern);
  }
  assert.equal(
    plans[0].states[0].modeContextHash,
    hashHkVisualizationModeContext(plans[0].states[0].modeContext),
  );
  assert.equal(
    plans[0].states[0].rehydrationActionsHash,
    hashHkVisualizationRehydrationActions(
      plans[0].states[0].rehydrationActions,
    ),
  );
});

test("missing, extra, duplicate, and out-of-order state receipts fail closed", () => {
  const plans = [cell("cell-a", 2)] as const;
  const receipts = passingReceipts(plans);
  const missing = clone(receipts);
  missing[0].stateReceipts.pop();
  assert.throws(() => validate(plans, missing), /missing a state receipt/);
  const extra = clone(receipts);
  extra[0].stateReceipts.push(clone(extra[0].stateReceipts[0]));
  extra[0].stateReceipts[2].stateId = "extra-state";
  assert.throws(() => validate(plans, extra), /extra state receipt/);
  const duplicate = clone(receipts);
  duplicate[0].stateReceipts[1] = clone(duplicate[0].stateReceipts[0]);
  assert.throws(() => validate(plans, duplicate), /duplicate state/);
  const outOfOrder = clone(receipts);
  outOfOrder[0].stateReceipts.reverse();
  assert.throws(() => validate(plans, outOfOrder), /stateId|out of order/);
});

test("every mandatory math/layout/collision/contrast/controlVisibility/target44/hitTarget audit is exact", () => {
  const plans = [cell("cell-a", 1)] as const;
  for (const auditId of HK_VISUALIZATION_MANDATORY_STATE_AUDIT_IDS) {
    const missing = clone(passingReceipts(plans));
    delete missing[0].stateReceipts[0].audits[auditId];
    assert.throws(
      () => validate(plans, missing),
      /exactly every mandatory audit/,
    );
  }
  const extra = clone(passingReceipts(plans));
  extra[0].stateReceipts[0].audits.unknown = {
    auditId: "unknown",
    evidence: { unknown: true },
    evidenceHash: sha256HkVisualizationCanonical({ unknown: true }),
    failure: null,
    issues: [],
    retryCount: 0,
    status: "passed",
  };
  assert.throws(() => validate(plans, extra), /exactly every mandatory audit/);
});

test("mandatory audit receipts carry non-empty canonical JSON evidence whose hash is recomputed", () => {
  const plans = [cell("cell-a", 1)] as const;
  const staleHash = clone(passingReceipts(plans));
  staleHash[0].stateReceipts[0].audits.math.evidence.measurements[0].value =
    "changed";
  assert.throws(() => validate(plans, staleHash), /evidenceHash.*evidence/);

  const forgedHash = clone(passingReceipts(plans));
  forgedHash[0].stateReceipts[0].audits.math.evidenceHash =
    sha256HkVisualizationCanonical({ forged: true });
  assert.throws(() => validate(plans, forgedHash), /evidenceHash.*evidence/);

  for (const evidence of [null, "", [], {}]) {
    const empty = clone(passingReceipts(plans));
    empty[0].stateReceipts[0].audits.math.evidence = evidence;
    empty[0].stateReceipts[0].audits.math.evidenceHash =
      hashHkVisualizationAuditEvidence("math", evidence);
    assert.throws(() => validate(plans, empty), /evidence.*non-empty/);
  }

  for (const evidence of [undefined, Number.NaN, new Date()]) {
    const nonJson = clone(passingReceipts(plans));
    nonJson[0].stateReceipts[0].audits.math.evidence = evidence;
    nonJson[0].stateReceipts[0].audits.math.evidenceHash =
      sha256HkVisualizationCanonical({ placeholder: true });
    assert.throws(
      () => validate(plans, nonJson),
      /evidence.*JSON|non-finite|plain JSON/,
    );
  }
});

test("skipped or failed chunk, state, reset, and audit statuses fail closed", () => {
  const plans = [cell("cell-a", 1)] as const;
  const mutations = [
    (receipts: any[]) => {
      receipts[0].status = "skipped";
    },
    (receipts: any[]) => {
      receipts[0].status = "failed";
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].status = "skipped";
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].status = "failed";
    },
    (receipts: any[]) => {
      receipts[0].finalReset.status = "skipped";
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].audits.math.status = "skipped";
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].audits.layout.status = "failed";
    },
  ];
  for (const mutate of mutations) {
    const receipts = clone(passingReceipts(plans));
    mutate(receipts);
    assert.throws(() => validate(plans, receipts), /did not pass/);
  }
});

test("failures, audit issues, and retries at every receipt level fail closed", () => {
  const plans = [cell("cell-a", 1)] as const;
  const mutations = [
    (receipts: any[]) => {
      receipts[0].failure = "chunk failed";
    },
    (receipts: any[]) => {
      receipts[0].retryCount = 1;
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].failure = "state failed";
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].retryCount = 1;
    },
    (receipts: any[]) => {
      receipts[0].finalReset.failure = "reset failed";
    },
    (receipts: any[]) => {
      receipts[0].finalReset.retryCount = 1;
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].audits.collision.failure =
        "collision audit failed";
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].audits.target44.retryCount = 1;
    },
    (receipts: any[]) => {
      receipts[0].stateReceipts[0].audits.contrast.issues = ["contrast 2.9:1"];
    },
    (receipts: any[]) => {
      receipts[0].finalReset.audits.hitTarget.issues = ["target obscured"];
    },
  ];
  for (const mutate of mutations) {
    const receipts = clone(passingReceipts(plans));
    mutate(receipts);
    assert.throws(
      () => validate(plans, receipts),
      /failure|retry|audit issues/,
    );
  }
});

test("absent, premature, duplicate, or mismatched final reset receipts fail closed", () => {
  const plans = [cell("cell-a", 33)] as const;
  const absent = clone(passingReceipts(plans));
  absent[1].finalReset = null;
  assert.throws(() => validate(plans, absent), /missing its final reset/);
  const premature = clone(passingReceipts(plans));
  premature[0].finalReset = clone(premature[1].finalReset);
  assert.throws(() => validate(plans, premature), /premature or duplicate/);
  const mismatch = clone(passingReceipts(plans));
  mismatch[1].finalReset.observedSignature = "wrong-reset";
  assert.throws(() => validate(plans, mismatch), /observed signature/);
  const descriptor = clone(passingReceipts(plans));
  descriptor[1].finalReset.observedDescriptorHash =
    sha256HkVisualizationCanonical({ wrong: "reset descriptor" });
  assert.throws(() => validate(plans, descriptor), /descriptor hash/);
  const missingAudit = clone(passingReceipts(plans));
  delete missingAudit[1].finalReset.audits.math;
  assert.throws(
    () => validate(plans, missingAudit),
    /exactly every mandatory audit/,
  );
});
