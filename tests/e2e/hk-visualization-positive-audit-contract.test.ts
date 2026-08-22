import assert from "node:assert/strict";
import test from "node:test";
import {
  HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
  buildHkVisualizationPositiveAuditReceipt,
  hashHkVisualizationContrastTargetEvidence,
  hashHkVisualizationInteractiveControlKeys,
  hashHkVisualizationPositiveAuditBinding,
  hashHkVisualizationPositiveAuditReceiptSet,
  hashHkVisualizationProjectedAbsenceSet,
  validateHkVisualizationPositiveAuditReceiptSet,
  type HkVisualizationCollisionAuditEvidence,
  type HkVisualizationContrastAuditEvidence,
  type HkVisualizationContrastTargetEvidence,
  type HkVisualizationControlVisibilityAuditEvidence,
  type HkVisualizationHitTargetAuditEvidence,
  type HkVisualizationLayoutAuditEvidence,
  type HkVisualizationMathAuditEvidence,
  type HkVisualizationPositiveAuditBinding,
  type HkVisualizationProjectedControlEvidence,
  type HkVisualizationTarget44AuditEvidence,
} from "./hk-visualization-positive-audit-contract";
import {
  hashHkVisualizationAuditEvidence,
  sha256HkVisualizationCanonical,
  type HkVisualizationMandatoryAuditReceiptSet,
  type HkVisualizationMandatoryStateAuditId,
} from "./hk-visualization-state-chunk-contract";

function fixtureHash(label: string) {
  return sha256HkVisualizationCanonical({ label });
}

function buildPositiveFixture() {
  const rehydrationActionsHash = fixtureHash("rehydration-actions");
  const projectedAbsences = Object.freeze([
    Object.freeze({
      controlId: "y",
      controllerActionId: "range:x",
      controllerActionIndex: 1,
      disposition: "projected-fixed" as const,
      expectedFixedValue: 5,
      fixedNodeCount: 1 as const,
      fixedNodeInteractive: false as const,
      fixedNodeLearnerVisible: true as const,
      fixedNodeSelector: '[data-viz-fixed-parameter="y"]',
      fixedNodeTabbable: false as const,
      interactiveCount: 0 as const,
      interactiveSelector: '[data-viz-parameter="y"]',
      observedFixedValue: 5,
      projection: "clamp-and-visibility" as const,
      reason: "x clamps y and projects its fixed learner-visible value",
      rehydrationActionsHash,
      serializedStateValue: 5,
    }),
  ] satisfies readonly HkVisualizationProjectedControlEvidence[]);
  const projectedAbsenceSetHash =
    hashHkVisualizationProjectedAbsenceSet(projectedAbsences);
  const stateHash = fixtureHash("state:x=4|y=5");
  const descriptorHash = fixtureHash("descriptor:x-range-y-fixed");
  const binding = Object.freeze({
    cellId: "P3/p3-fractions-intro/desktop/en/light",
    contractVersion: HK_VISUALIZATION_POSITIVE_AUDIT_CONTRACT_VERSION,
    domainId: "fraction-bar-numerator-v1",
    expectedDescriptorHash: descriptorHash,
    expectedSignatureHash: stateHash,
    labId: "p3-fractions-intro",
    modeContextHash: fixtureHash("mode-context:fraction"),
    modeId: "fraction",
    moduleId: "configured-visualization-lab" as const,
    observedDescriptorHash: descriptorHash,
    observedSignatureHash: stateHash,
    phase: "state-0001",
    projectedAbsenceSetHash,
    rehydrationActionsHash,
    stateId: "state-0001",
    stateIndex: 1,
    topicId: "p3-fractions-intro",
  } satisfies HkVisualizationPositiveAuditBinding);

  const interactiveControlKeys = Object.freeze([
    "mode:fraction",
    "parameter:x",
    "reset:model",
  ]);
  const interactiveControlKeysHash = hashHkVisualizationInteractiveControlKeys(
    interactiveControlKeys,
  );

  const math = Object.freeze({
    activeModeEvidence: Object.freeze({
      activeSelector: '[data-viz-mode="fraction"]',
      exactMatchCount: 1,
      expectedModeId: "fraction",
      observedModeId: "fraction",
    }),
    allowedExtraStateKeys: Object.freeze([]),
    auditCompleted: true as const,
    binding,
    canonicalState: Object.freeze({ x: 4, y: 5 }),
    checks: Object.freeze([
      Object.freeze({
        absoluteTolerance: null,
        checkId: "fraction-state-sum",
        independentlyComputedExpected: 9,
        kind: "integer-exact" as const,
        observed: 9,
        operands: Object.freeze({ x: 4, y: 5 }),
        passed: true as const,
        relativeTolerance: null,
      }),
    ]),
    evaluatorFamily: "conservation-count",
    formulaEvidence: Object.freeze([
      Object.freeze({
        formulaId: "sum",
        normalizedValue: "4 + 5 = 9",
        selector: '[data-viz-formula="sum"]',
      }),
    ]),
    marks: Object.freeze([
      Object.freeze({
        attributes: Object.freeze({ sum: 9 }),
        exactCount: 1,
        expectedCount: 1,
        markId: "sum-mark",
        selector: '[data-viz-name="sum-mark"]',
        visibleCount: 1,
      }),
    ]),
    observedStateKeys: Object.freeze(["x", "y"]),
    oracleId: "p3-fractions-intro.math.v1",
    oracleSource: "independent-test-oracle" as const,
    oracleVersion: "v1",
    projectedAbsenceSetHash,
    projectedAbsences,
    requiredStateKeys: Object.freeze(["x", "y"]),
    scannerException: null,
  } satisfies HkVisualizationMathAuditEvidence);

  const layout = Object.freeze({
    auditCompleted: true as const,
    binding,
    clippedCandidateCount: 0 as const,
    document: Object.freeze({
      clientWidth: 1440,
      overflowPx: 0,
      scrollWidth: 1440,
    }),
    educationalScrollContainers: Object.freeze([
      Object.freeze({
        clientWidth: 640,
        focusable: true as const,
        key: "surface:main",
        learnerVisible: true as const,
        maximumScrollLeft: 160,
        panHintKind: "explicit-attribute" as const,
        reachedEnd: true as const,
        reachedScrollLeft: 160,
        scrollWidth: 800,
      }),
    ]),
    inspectedCandidateCount: 12,
    issueCount: 0 as const,
    learnerVisibleCandidateCount: 12,
    scannerException: null,
    tolerancePx: 2 as const,
    workspace: Object.freeze({
      clientWidth: 800,
      overflowPx: 0,
      overflowX: "visible",
      scrollWidth: 800,
    }),
  } satisfies HkVisualizationLayoutAuditEvidence);

  const collision = Object.freeze({
    auditCompleted: true as const,
    binding,
    canvasSurfaceCount: 0 as const,
    inspected: Object.freeze({
      candidatePairCounts: Object.freeze({
        "control-control": 3,
        "dom-text-text": 4,
        "svg-label-label": 2,
        "svg-label-mark": 6,
        "text-control": 5,
        "text-occlusion": 4,
      }),
      htmlTextFragmentCount: 4,
      learnerControlCount: 3,
      paintedMarkCount: 5,
      svgTextFragmentCount: 3,
    }),
    issueCount: 0 as const,
    maximumRecordedIssues: 100 as const,
    overlapExemptions: Object.freeze([
      Object.freeze({
        areaRatio: 0.02,
        candidateCount: 2 as const,
        heightRatio: 0.1,
        owner: 'g[0] overlap-id="fraction-label"',
        pair: Object.freeze([
          "[label] text[0] fraction",
          "[mark] line[0] bar",
        ]) as readonly [string, string],
        reason: "label is intentionally anchored to its own fraction bar",
        risk: "explicit-narrow-pair" as const,
        scope: "svg-group" as const,
        widthRatio: 0.2,
      }),
    ]),
    scannerException: null,
    svgSurfaceCount: 1,
    tolerancePx: 4 as const,
    truncated: false as const,
  } satisfies HkVisualizationCollisionAuditEvidence);

  const contrastTargets = Object.freeze([
    Object.freeze({
      background: "rgb(255, 255, 255)",
      backgroundLuminance: 1,
      contrastRatio: 4.6,
      effectiveOpacity: 1,
      foreground: "rgb(90, 90, 90)",
      requiredRatio: 4.5,
      target: 'p "4 + 5 = 9"',
      targetKey: "formula:sum",
    }),
    Object.freeze({
      background: "rgb(255, 255, 255)",
      backgroundLuminance: 1,
      contrastRatio: 7,
      effectiveOpacity: 1,
      foreground: "rgb(70, 70, 70)",
      requiredRatio: 4.5,
      target: 'span "x=4 y=5"',
      targetKey: "state:sum",
    }),
  ] satisfies readonly HkVisualizationContrastTargetEvidence[]);
  const contrast = Object.freeze({
    auditCompleted: true as const,
    binding,
    checkedTextCount: contrastTargets.length,
    evidenceCount: contrastTargets.length,
    issueCount: 0 as const,
    normalizedTargetEvidenceHash:
      hashHkVisualizationContrastTargetEvidence(contrastTargets),
    scannerException: null,
    targets: contrastTargets,
    worst: contrastTargets[0],
  } satisfies HkVisualizationContrastAuditEvidence);

  const interactiveControls = Object.freeze([
    Object.freeze({
      ariaDisabled: false as const,
      controlKey: "mode:fraction",
      declaredControlId: null,
      disabled: false as const,
      interactive: true as const,
      learnerExposed: true as const,
      pointerEventsNone: false as const,
      role: "button",
      tag: "button",
      visuallyVisible: true as const,
    }),
    Object.freeze({
      ariaDisabled: false as const,
      controlKey: "parameter:x",
      declaredControlId: "x",
      disabled: false as const,
      interactive: true as const,
      learnerExposed: true as const,
      pointerEventsNone: false as const,
      role: "slider",
      tag: "input",
      visuallyVisible: true as const,
    }),
    Object.freeze({
      ariaDisabled: false as const,
      controlKey: "reset:model",
      declaredControlId: null,
      disabled: false as const,
      interactive: true as const,
      learnerExposed: true as const,
      pointerEventsNone: false as const,
      role: "button",
      tag: "button",
      visuallyVisible: true as const,
    }),
  ]);
  const controlVisibility = Object.freeze({
    auditCompleted: true as const,
    binding,
    declaredStateControlCount: 2,
    disabledOrAriaDisabledCount: 0 as const,
    interactiveControlKeysHash,
    interactiveControls,
    invisibleTabbableCount: 0 as const,
    nonLearnerExposedCount: 0 as const,
    observedInteractiveControlCount: interactiveControls.length,
    projectedAbsenceSetHash,
    projectedFixedControlCount: projectedAbsences.length,
    projectedFixedControls: projectedAbsences,
    scannerException: null,
  } satisfies HkVisualizationControlVisibilityAuditEvidence);

  const targetControls = Object.freeze([
    Object.freeze({
      controlKey: "mode:fraction",
      explicitPointerTarget: false,
      minimum44: true as const,
      ownHeight: 48,
      ownWidth: 100,
      pointerScopeIssueCount: 0 as const,
      targetHeight: 48,
      targetPolicy: "self" as const,
      targetWidth: 100,
    }),
    Object.freeze({
      controlKey: "parameter:x",
      explicitPointerTarget: true,
      minimum44: true as const,
      ownHeight: 24,
      ownWidth: 180,
      pointerScopeIssueCount: 0 as const,
      targetHeight: 44,
      targetPolicy: "associated-label" as const,
      targetWidth: 180,
    }),
    Object.freeze({
      controlKey: "reset:model",
      explicitPointerTarget: false,
      minimum44: true as const,
      ownHeight: 52,
      ownWidth: 120,
      pointerScopeIssueCount: 0 as const,
      targetHeight: 52,
      targetPolicy: "self" as const,
      targetWidth: 120,
    }),
  ]);
  const target44 = Object.freeze({
    auditCompleted: true as const,
    auditedControlCount: targetControls.length,
    auditedControlKeysHash: interactiveControlKeysHash,
    binding,
    controls: targetControls,
    excludedProjectedFixedControlKeys: Object.freeze(["y"]),
    minimumObserved: Object.freeze({
      controlKey: "parameter:x",
      height: 44,
      width: 180,
    }),
    projectedAbsenceSetHash,
    scannerException: null,
  } satisfies HkVisualizationTarget44AuditEvidence);

  const hitControls = Object.freeze([
    Object.freeze({
      acceptedHitPolicy: "own-centre" as const,
      centreX: 100,
      centreY: 80,
      controlKey: "mode:fraction",
      effectiveTargetCentreHit: true,
      ownCentreHit: true,
      passed: true as const,
      topHitKey: "mode:fraction",
    }),
    Object.freeze({
      acceptedHitPolicy: "validated-associated-target-centre" as const,
      centreX: 200,
      centreY: 120,
      controlKey: "parameter:x",
      effectiveTargetCentreHit: true,
      ownCentreHit: false,
      passed: true as const,
      topHitKey: "pointer-target:parameter:x",
    }),
    Object.freeze({
      acceptedHitPolicy: "own-centre" as const,
      centreX: 300,
      centreY: 160,
      controlKey: "reset:model",
      effectiveTargetCentreHit: true,
      ownCentreHit: true,
      passed: true as const,
      topHitKey: "reset:model",
    }),
  ]);
  const hitTarget = Object.freeze({
    auditCompleted: true as const,
    auditedControlCount: hitControls.length,
    auditedControlKeysHash: interactiveControlKeysHash,
    binding,
    controls: hitControls,
    excludedProjectedFixedControlKeys: Object.freeze(["y"]),
    projectedAbsenceSetHash,
    scannerException: null,
  } satisfies HkVisualizationHitTargetAuditEvidence);

  const receipts = Object.freeze({
    collision: buildHkVisualizationPositiveAuditReceipt("collision", collision),
    contrast: buildHkVisualizationPositiveAuditReceipt("contrast", contrast),
    controlVisibility: buildHkVisualizationPositiveAuditReceipt(
      "controlVisibility",
      controlVisibility,
    ),
    hitTarget: buildHkVisualizationPositiveAuditReceipt("hitTarget", hitTarget),
    layout: buildHkVisualizationPositiveAuditReceipt("layout", layout),
    math: buildHkVisualizationPositiveAuditReceipt("math", math),
    target44: buildHkVisualizationPositiveAuditReceipt("target44", target44),
  } satisfies HkVisualizationMandatoryAuditReceiptSet);

  return Object.freeze({ binding, receipts });
}

type MutableRecord = Record<string, unknown>;

function mutableClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function mutableRecord(value: unknown): MutableRecord {
  assert.ok(value && typeof value === "object" && !Array.isArray(value));
  return value as MutableRecord;
}

function mutableArray(value: unknown): unknown[] {
  assert.ok(Array.isArray(value));
  return value;
}

type MutableFixture = {
  binding: HkVisualizationPositiveAuditBinding;
  receipts: MutableRecord;
};

function receipt(fixture: MutableFixture, auditId: string) {
  return mutableRecord(fixture.receipts[auditId]);
}

function evidence(fixture: MutableFixture, auditId: string) {
  return mutableRecord(receipt(fixture, auditId).evidence);
}

function rehash(
  fixture: MutableFixture,
  auditId: HkVisualizationMandatoryStateAuditId,
) {
  const current = receipt(fixture, auditId);
  current.evidenceHash = hashHkVisualizationAuditEvidence(
    auditId,
    current.evidence,
  );
}

function projection(
  fixture: MutableFixture,
  auditId: "math" | "controlVisibility",
) {
  const key =
    auditId === "math" ? "projectedAbsences" : "projectedFixedControls";
  return mutableRecord(mutableArray(evidence(fixture, auditId)[key])[0]);
}

test("one complete exact-seven positive fixture validates and hashes deterministically", () => {
  const fixture = buildPositiveFixture();
  const result = validateHkVisualizationPositiveAuditReceiptSet({
    expectedBinding: fixture.binding,
    receipts: fixture.receipts,
  });
  assert.equal(result.status, "passed");
  assert.equal(
    result.bindingHash,
    hashHkVisualizationPositiveAuditBinding(fixture.binding),
  );
  assert.equal(
    result.receiptSetHash,
    hashHkVisualizationPositiveAuditReceiptSet(fixture.receipts),
  );
  assert.deepEqual(
    validateHkVisualizationPositiveAuditReceiptSet({
      expectedBinding: fixture.binding,
      receipts: fixture.receipts,
    }),
    result,
  );
});

type NegativeCase = Readonly<{
  mutate: (fixture: MutableFixture) => void;
  name: string;
  pattern: RegExp;
}>;

const negativeCases: readonly NegativeCase[] = [
  {
    name: "rejects a missing math receipt",
    mutate: (fixture) => {
      delete fixture.receipts.math;
    },
    pattern: /extra or missing keys/,
  },
  {
    name: "rejects an extra audit receipt",
    mutate: (fixture) => {
      fixture.receipts.extra = mutableClone(fixture.receipts.math);
    },
    pattern: /extra or missing keys/,
  },
  {
    name: "rejects hollow math evidence such as passed true",
    mutate: (fixture) => {
      receipt(fixture, "math").evidence = { passed: true };
      rehash(fixture, "math");
    },
    pattern: /extra or missing keys/,
  },
  {
    name: "rejects a math oracle belonging to a different topic",
    mutate: (fixture) => {
      evidence(fixture, "math").oracleId = "other-topic.math.v1";
      rehash(fixture, "math");
    },
    pattern: /not topic-specific/,
  },
  {
    name: "rejects math evidence with no independently checked invariant",
    mutate: (fixture) => {
      evidence(fixture, "math").checks = [];
      rehash(fixture, "math");
    },
    pattern: /checks cannot be empty/,
  },
  {
    name: "rejects a self-reported math pass whose observed result is wrong",
    mutate: (fixture) => {
      const check = mutableRecord(
        mutableArray(evidence(fixture, "math").checks)[0],
      );
      check.observed = 10;
      rehash(fixture, "math");
    },
    pattern: /independently computed and observed evidence differ/,
  },
  {
    name: "rejects math evidence without formula binding",
    mutate: (fixture) => {
      evidence(fixture, "math").formulaEvidence = [];
      rehash(fixture, "math");
    },
    pattern: /formulaEvidence cannot be empty/,
  },
  {
    name: "rejects math evidence without visible mark binding",
    mutate: (fixture) => {
      evidence(fixture, "math").marks = [];
      rehash(fixture, "math");
    },
    pattern: /marks cannot be empty/,
  },
  {
    name: "rejects an unapproved serialized math state key",
    mutate: (fixture) => {
      evidence(fixture, "math").observedStateKeys = ["legacy", "x", "y"];
      const state = mutableRecord(evidence(fixture, "math").canonicalState);
      state.legacy = 9;
      rehash(fixture, "math");
    },
    pattern: /unapproved state keys/,
  },
  {
    name: "rejects a zero-candidate layout scan",
    mutate: (fixture) => {
      evidence(fixture, "layout").inspectedCandidateCount = 0;
      evidence(fixture, "layout").learnerVisibleCandidateCount = 0;
      rehash(fixture, "layout");
    },
    pattern: /inspectedCandidateCount must be positive/,
  },
  {
    name: "rejects layout document overflow",
    mutate: (fixture) => {
      const document = mutableRecord(evidence(fixture, "layout").document);
      document.scrollWidth = 1444;
      document.overflowPx = 4;
      rehash(fixture, "layout");
    },
    pattern: /document has horizontal overflow/,
  },
  {
    name: "rejects a non-focusable educational scroll container",
    mutate: (fixture) => {
      const container = mutableRecord(
        mutableArray(
          evidence(fixture, "layout").educationalScrollContainers,
        )[0],
      );
      container.focusable = false;
      rehash(fixture, "layout");
    },
    pattern: /focusable must equal true/,
  },
  {
    name: "rejects collision evidence with no SVG surface",
    mutate: (fixture) => {
      evidence(fixture, "collision").svgSurfaceCount = 0;
      rehash(fixture, "collision");
    },
    pattern: /svgSurfaceCount must be positive/,
  },
  {
    name: "rejects a truncated collision scan",
    mutate: (fixture) => {
      evidence(fixture, "collision").truncated = true;
      rehash(fixture, "collision");
    },
    pattern: /truncated must equal false/,
  },
  {
    name: "rejects a collision exemption with a blank reason",
    mutate: (fixture) => {
      const exemption = mutableRecord(
        mutableArray(evidence(fixture, "collision").overlapExemptions)[0],
      );
      exemption.reason = "   ";
      rehash(fixture, "collision");
    },
    pattern: /reason must be a nonblank string/,
  },
  {
    name: "rejects collision evidence that checked no candidate pairs",
    mutate: (fixture) => {
      const inspected = mutableRecord(evidence(fixture, "collision").inspected);
      const pairs = mutableRecord(inspected.candidatePairCounts);
      for (const key of Object.keys(pairs)) pairs[key] = 0;
      rehash(fixture, "collision");
    },
    pattern: /checked no candidate pairs/,
  },
  {
    name: "rejects a zero-text contrast scan",
    mutate: (fixture) => {
      const contrast = evidence(fixture, "contrast");
      contrast.checkedTextCount = 0;
      contrast.evidenceCount = 0;
      contrast.targets = [];
      rehash(fixture, "contrast");
    },
    pattern: /targets cannot be empty/,
  },
  {
    name: "rejects contrast evidence with a null worst target",
    mutate: (fixture) => {
      evidence(fixture, "contrast").worst = null;
      rehash(fixture, "contrast");
    },
    pattern: /worst must be a plain object/,
  },
  {
    name: "rejects a contrast target evidence hash drift",
    mutate: (fixture) => {
      evidence(fixture, "contrast").normalizedTargetEvidenceHash = fixtureHash(
        "wrong-target-evidence",
      );
      rehash(fixture, "contrast");
    },
    pattern: /normalized target evidence hash drifted/,
  },
  {
    name: "rejects a scanner exception wrapped inside a passed receipt",
    mutate: (fixture) => {
      evidence(fixture, "contrast").scannerException = "unknown SVG paint";
      rehash(fixture, "contrast");
    },
    pattern: /scannerException must equal null/,
  },
  {
    name: "rejects an incomplete audit packaged as passed",
    mutate: (fixture) => {
      evidence(fixture, "layout").auditCompleted = false;
      rehash(fixture, "layout");
    },
    pattern: /auditCompleted must equal true/,
  },
  {
    name: "rejects an invisible tabbable control count",
    mutate: (fixture) => {
      evidence(fixture, "controlVisibility").invisibleTabbableCount = 1;
      rehash(fixture, "controlVisibility");
    },
    pattern: /invisibleTabbableCount must equal 0/,
  },
  {
    name: "rejects a declared state control that is neither interactive nor projected",
    mutate: (fixture) => {
      evidence(fixture, "controlVisibility").declaredStateControlCount = 3;
      rehash(fixture, "controlVisibility");
    },
    pattern: /does not account for every declared state control/,
  },
  {
    name: "rejects projected absence without an owning controller action",
    mutate: (fixture) => {
      projection(fixture, "controlVisibility").controllerActionId = "";
      rehash(fixture, "controlVisibility");
    },
    pattern: /controllerActionId must be a nonblank string/,
  },
  {
    name: "rejects projected absence with multiple fixed nodes",
    mutate: (fixture) => {
      projection(fixture, "controlVisibility").fixedNodeCount = 2;
      rehash(fixture, "controlVisibility");
    },
    pattern: /fixedNodeCount must equal 1/,
  },
  {
    name: "rejects a projected fixed value that differs from serialized state",
    mutate: (fixture) => {
      projection(fixture, "controlVisibility").serializedStateValue = 4;
      rehash(fixture, "controlVisibility");
    },
    pattern: /fixed values differ/,
  },
  {
    name: "rejects projected absence with a blank reason",
    mutate: (fixture) => {
      projection(fixture, "controlVisibility").reason = "";
      rehash(fixture, "controlVisibility");
    },
    pattern: /reason must be a nonblank string/,
  },
  {
    name: "rejects target44 silently dropping an interactive control",
    mutate: (fixture) => {
      const target = evidence(fixture, "target44");
      const controls = mutableArray(target.controls);
      controls.splice(1, 1);
      target.auditedControlCount = controls.length;
      const keys = controls.map((control) =>
        String(mutableRecord(control).controlKey),
      );
      target.auditedControlKeysHash =
        hashHkVisualizationInteractiveControlKeys(keys);
      target.minimumObserved = {
        controlKey: "mode:fraction",
        height: 48,
        width: 100,
      };
      rehash(fixture, "target44");
    },
    pattern: /control key hashes differ/,
  },
  {
    name: "rejects a target44 key hash that does not match its controls",
    mutate: (fixture) => {
      evidence(fixture, "target44").auditedControlKeysHash =
        fixtureHash("wrong-target-keys");
      rehash(fixture, "target44");
    },
    pattern: /audited control key hash drifted/,
  },
  {
    name: "rejects target44 omitting its explicit projected-fixed exclusion",
    mutate: (fixture) => {
      evidence(fixture, "target44").excludedProjectedFixedControlKeys = [];
      rehash(fixture, "target44");
    },
    pattern: /does not equal the exact projected-fixed controls/,
  },
  {
    name: "rejects a hitTarget key hash that does not match visibility",
    mutate: (fixture) => {
      const hit = evidence(fixture, "hitTarget");
      const controls = mutableArray(hit.controls);
      mutableRecord(controls[2]).controlKey = "reset:other";
      hit.auditedControlKeysHash = hashHkVisualizationInteractiveControlKeys([
        "mode:fraction",
        "parameter:x",
        "reset:other",
      ]);
      rehash(fixture, "hitTarget");
    },
    pattern: /control key hashes differ/,
  },
  {
    name: "rejects a covered centre packaged as a passed hit target",
    mutate: (fixture) => {
      const hit = mutableRecord(
        mutableArray(evidence(fixture, "hitTarget").controls)[0],
      );
      hit.ownCentreHit = false;
      rehash(fixture, "hitTarget");
    },
    pattern: /did not hit its own centre/,
  },
  {
    name: "rejects a swapped state binding",
    mutate: (fixture) => {
      mutableRecord(evidence(fixture, "math").binding).stateId = "state-9999";
      rehash(fixture, "math");
    },
    pattern: /does not equal the expected exact state binding/,
  },
  {
    name: "rejects a swapped mode binding",
    mutate: (fixture) => {
      mutableRecord(evidence(fixture, "layout").binding).modeId = "compare";
      rehash(fixture, "layout");
    },
    pattern: /does not equal the expected exact state binding/,
  },
  {
    name: "rejects expected and observed descriptor binding drift",
    mutate: (fixture) => {
      mutableRecord(
        evidence(fixture, "collision").binding,
      ).observedDescriptorHash = fixtureHash("drifted-descriptor");
      rehash(fixture, "collision");
    },
    pattern: /expected and observed descriptor hashes differ/,
  },
  {
    name: "rejects duplicate control identities instead of using first",
    mutate: (fixture) => {
      const controls = mutableArray(
        evidence(fixture, "controlVisibility").interactiveControls,
      );
      mutableRecord(controls[2]).controlKey = "parameter:x";
      rehash(fixture, "controlVisibility");
    },
    pattern: /must be unique and sorted/,
  },
  {
    name: "rejects a skipped receipt",
    mutate: (fixture) => {
      receipt(fixture, "math").status = "skipped";
    },
    pattern: /status must equal "passed"/,
  },
  {
    name: "rejects a retried receipt",
    mutate: (fixture) => {
      receipt(fixture, "layout").retryCount = 1;
    },
    pattern: /retryCount must equal 0/,
  },
  {
    name: "rejects a receipt carrying issues",
    mutate: (fixture) => {
      receipt(fixture, "collision").issues = ["collision"];
    },
    pattern: /issues must be empty/,
  },
  {
    name: "rejects an evidence hash mismatch",
    mutate: (fixture) => {
      receipt(fixture, "contrast").evidenceHash = fixtureHash("wrong-evidence");
    },
    pattern: /evidenceHash does not match/,
  },
  {
    name: "rejects extra evidence fields that could hide scanner exceptions",
    mutate: (fixture) => {
      evidence(fixture, "layout").exception = "hidden failure";
      rehash(fixture, "layout");
    },
    pattern: /extra or missing keys/,
  },
  {
    name: "rejects missing exact evidence fields",
    mutate: (fixture) => {
      delete evidence(fixture, "contrast").issueCount;
      rehash(fixture, "contrast");
    },
    pattern: /extra or missing keys/,
  },
  {
    name: "rejects math and control projection evidence disagreement",
    mutate: (fixture) => {
      projection(fixture, "math").reason =
        "a different projection explanation that must not be accepted";
      const math = evidence(fixture, "math");
      const projected =
        math.projectedAbsences as HkVisualizationProjectedControlEvidence[];
      const projectionHash = hashHkVisualizationProjectedAbsenceSet(projected);
      math.projectedAbsenceSetHash = projectionHash;
      mutableRecord(math.binding).projectedAbsenceSetHash = projectionHash;
      rehash(fixture, "math");
    },
    pattern: /does not equal the expected exact state binding/,
  },
];

for (const negativeCase of negativeCases) {
  test(negativeCase.name, () => {
    const baseline = buildPositiveFixture();
    const fixture = mutableClone({
      binding: baseline.binding,
      receipts: baseline.receipts,
    }) as MutableFixture;
    negativeCase.mutate(fixture);
    assert.throws(
      () =>
        validateHkVisualizationPositiveAuditReceiptSet({
          expectedBinding: fixture.binding,
          receipts: fixture.receipts,
        }),
      negativeCase.pattern,
    );
  });
}
