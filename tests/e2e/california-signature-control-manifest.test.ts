import assert from "node:assert/strict";
import test from "node:test";
import {
  assertCaliforniaSignatureSourceManifestFrozen,
  assertExactCaliforniaSignatureCoverage,
  assertReviewedCaliforniaSignatureRuntimeSnapshot,
  assertCaliforniaSignatureSourceTargetsResolved,
  buildCaliforniaSignatureSourceManifest,
  canonicalCaliforniaSignatureNumericEndpoints,
  CALIFORNIA_SIGNATURE_COMPONENT_SOURCE_SHA256,
  CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256,
  CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY,
  estimateCaliforniaSignatureTraversalScale,
  inspectCaliforniaSignatureStaticCollectionForTest,
  resolveCaliforniaSignatureNumericEndpoints,
  snapshotCaliforniaSignatureRuntimeCoverage,
  traverseCaliforniaSignatureBenchControls,
  type CaliforniaSignatureBenchControlBlueprint,
  type CaliforniaSignatureRuntimeEndpoint,
  type CaliforniaSignatureTraversalControl
} from "./california-signature-control-manifest";

test("the static collection analyzer terminates on identifier and helper cycles", () => {
  assert.deepEqual(
    inspectCaliforniaSignatureStaticCollectionForTest(
      `
        const left = right;
        const right = left;
        const recursive = (value) => recursive(value);
        const mutualA = (value) => mutualB(value);
        const mutualB = (value) => mutualA(value);
        const looped = recursive(left);
        const mutual = mutualA(right);
      `,
      "[...looped, ...mutual]"
    ),
    { exact: false, length: 2 },
    "recursive source must fail closed with a finite fallback rather than overflow"
  );
  assert.deepEqual(
    inspectCaliforniaSignatureStaticCollectionForTest(
      `
        const VALUES = [1, 2, 3];
        const identity = (value) => value;
        const result = identity(VALUES);
      `,
      "result"
    ),
    { exact: true, length: 3 },
    "a non-recursive callsite parameter remains source-resolvable"
  );
});

test("California reachable signature benches retain the reviewed source and control blueprint", () => {
  const manifest = buildCaliforniaSignatureSourceManifest();
  assert.deepEqual(manifest.counts, {
    benches: 186,
    controlSites: 1_854,
    exactMultiplicitySites: 1_854,
    lessonChoices: 3_211,
    lessonSteps: 1_255,
    unresolvedInteractions: 0
  });
  assert.match(CALIFORNIA_SIGNATURE_COMPONENT_SOURCE_SHA256, /^[a-f0-9]{64}$/);
  assert.match(CALIFORNIA_SIGNATURE_CONTROL_BLUEPRINT_SHA256, /^[a-f0-9]{64}$/);
  assertCaliforniaSignatureSourceManifestFrozen(manifest);

  for (const bench of manifest.benches) {
    assert.ok(bench.lessonSteps.length >= 5, `${bench.benchId}: too few reviewed lesson steps`);
    assert.ok(bench.controlSites.length > 0, `${bench.benchId}: missing control sites`);
    assert.equal(
      new Set(bench.controlSites.map((site) => site.siteKey)).size,
      bench.controlSites.length,
      `${bench.benchId}: control site keys must be unique`
    );
    assert.deepEqual(
      bench.lessonSteps.map((step) => step.index),
      bench.lessonSteps.map((_, index) => index),
      `${bench.benchId}: lesson steps must be contiguous`
    );
  }
});

test("canonical numeric endpoints require one distinct step-valid interior midpoint", () => {
  assert.throws(
    () => canonicalCaliforniaSignatureNumericEndpoints(0, 1, 1, "binary-control"),
    /binary-control: numeric min\/max\/step expose no distinct reachable midpoint/
  );
  assert.deepEqual(
    canonicalCaliforniaSignatureNumericEndpoints(0, 10, 3, "non-divisible-step"),
    { min: "0", mid: "6", max: "10" },
    "the closest reachable interior value must be chosen without duplicating either endpoint"
  );
  assert.deepEqual(
    resolveCaliforniaSignatureNumericEndpoints({
      reason: "dynamic min/max/step expression requires exact runtime-state audit",
      sourceExpression: "canonical-midpoint(min=dynamicMin;max=dynamicMax;step=dynamicStep)",
      status: "runtime-audited"
    }, 1, 1, 1, "singleton-runtime-control"),
    {
      max: "1",
      mid: null,
      min: "1",
      reason: "runtime min=1; max=1; step=1 has only one distinct reachable value",
      reachableCardinality: 1,
      sourceExpression: "canonical-midpoint(min=dynamicMin;max=dynamicMax;step=dynamicStep)",
      status: "unavailable",
      step: "1"
    }
  );
});

test("every numeric source site explicitly audits whether a strict midpoint exists", () => {
  const manifest = buildCaliforniaSignatureSourceManifest();
  const numericSites = manifest.benches.flatMap((bench) => bench.controlSites
    .filter((site) => site.kind === "range" || site.kind === "number")
    .map((site) => ({ benchId: bench.benchId, site })));

  assert.equal(numericSites.length, 207, "the reviewed numeric-source inventory drifted");
  const unavailable: string[] = [];
  for (const { benchId, site } of numericSites) {
    assert.ok(site.numericMidpoint, `${benchId}/${site.siteKey}: numeric midpoint audit is missing`);
    if (site.numericMidpoint.status === "unavailable") {
      unavailable.push(`${benchId}/${site.siteKey}`);
      assert.deepEqual(site.endpointTargets.map((target) => target.name), ["min", "max"]);
      assert.match(site.numericMidpoint.reason, /no distinct step-valid interior value/);
    } else {
      assert.deepEqual(
        site.endpointTargets.map((target) => target.name),
        ["min", "mid", "max"],
        `${benchId}/${site.siteKey}: numeric source targets must include a reviewed midpoint`
      );
      const midpoint = site.endpointTargets[1];
      assert.ok(midpoint, `${benchId}/${site.siteKey}: midpoint target is missing`);
      assert.equal(midpoint.sourceExpression, site.numericMidpoint.sourceExpression);
      assert.match(
        midpoint.sourceExpression,
        /^canonical-midpoint\(min=.*;max=.*;step=.*\)$/,
        `${benchId}/${site.siteKey}: midpoint identity must bind exact min/max/step source expressions`
      );
    }
  }
  assert.deepEqual(unavailable, ["ConditionalLab/range:0:cf5c39cf0dafffca"]);
  assert.equal(numericSites.length - unavailable.length, 206);
});

test("the source-derived scale makes the exhaustive-axis split explicit", () => {
  const scale = estimateCaliforniaSignatureTraversalScale(buildCaliforniaSignatureSourceManifest());
  assert.deepEqual(scale, {
    functionalOneAxisKeys: 13_701,
    lessonStateTwelveAxisRecords: 15_060,
    naiveTwelveAxisKeys: 164_412,
    recommendedSplitRecords: 109_442,
    projectedControlInstances: 5_618,
    projectedEndpointActivations: 6_828,
    unresolvedMultiplicitySites: 0
  });
  assert.equal(
    scale.recommendedSplitRecords,
    scale.functionalOneAxisKeys + (1_255 * 11) + (scale.projectedEndpointActivations * 12),
    "every endpoint must receive all twelve independent layout-axis records"
  );
  assert.notEqual(
    scale.recommendedSplitRecords,
    scale.functionalOneAxisKeys + (1_255 * 11) + (scale.projectedEndpointActivations * 5),
    "the superseded six-layout-axis projection must remain rejected"
  );
});

test("every non-form source site has one exact reviewed semantic contract", () => {
  const manifest = buildCaliforniaSignatureSourceManifest();
  const interactions = manifest.benches.flatMap((bench) => bench.controlSites
    .filter((site) => site.kind === "interaction-surface")
    .map((site) => `${bench.benchId}\0${site.siteKey}`));
  const registrySites = CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.map((entry) =>
    `${entry.benchId}\0${entry.siteKey}`
  );
  assert.equal(interactions.length, 56);
  assert.deepEqual([...registrySites].sort(), [...interactions].sort());
  assert.equal(
    CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.reduce(
      (sum, entry) => sum + entry.endpointActions.length,
      0
    ),
    67
  );
  assert.doesNotThrow(() => assertCaliforniaSignatureSourceTargetsResolved(manifest));
});

test("imperative pointer listeners resolve to one exact JSX ref-backed interaction site", () => {
  const manifest = buildCaliforniaSignatureSourceManifest();
  const cylinder = manifest.benches.find((bench) => bench.benchId === "CylinderLab")!;
  const imperative = cylinder.controlSites.filter((site) => site.imperativeBinding != null);
  assert.equal(imperative.length, 1);
  assert.deepEqual(imperative[0].imperativeBinding, {
    receiverExpression: "stage",
    refExpression: "stageRef",
    eventTargets: [
      { eventName: "pointerdown", handlerExpression: "down" },
      { eventName: "pointermove", handlerExpression: "move" },
      { eventName: "pointerup", handlerExpression: "up" }
    ]
  });
  assert.equal(imperative[0].kind, "interaction-surface");
  assert.equal(imperative[0].expectedMultiplicity, 1);
  assert.equal(imperative[0].multiplicityIsExact, true);
  assert.deepEqual(imperative[0].endpointTargets.map((target) => target.name), ["drag"]);
  assert.equal(
    imperative[0].endpointTargets[0].sourceExpression,
    "pointerdown=down;pointermove=move;pointerup=up"
  );
  const unresolved = cylinder.unresolvedInteractions.filter((interaction) =>
    interaction.siteKey === imperative[0].siteKey
  );
  assert.equal(unresolved.length, 0, "the exact semantic registry closes this imperative site");
});

test("custom component callsites and every nested map contribute to exact instance identity", () => {
  const manifest = buildCaliforniaSignatureSourceManifest();
  const comparing = manifest.benches.find((bench) => bench.benchId === "ComparingLab")!;
  const digitDials = comparing.controlSites.find((site) => site.customComponentNamespace?.componentName === "DigitDials")!;
  assert.deepEqual(digitDials.customComponentNamespace, {
    callsiteCount: 2,
    componentName: "DigitDials",
    expression: "which",
    reviewedValues: ["a", "b"]
  });
  assert.equal(digitDials.expectedMultiplicity, 6);
  assert.deepEqual(digitDials.renderCollections, ["PLACES"]);

  const translate = manifest.benches.find((bench) => bench.benchId === "TranslateLab")!;
  const segment = translate.controlSites.find((site) => site.customComponentNamespace?.componentName === "Seg")!;
  assert.equal(segment.expectedMultiplicity, 4);
  assert.equal(segment.multiplicityIsExact, true);

  const table = manifest.benches.find((bench) => bench.benchId === "TableLab")!;
  const nested = table.controlSites.filter((site) => site.sourceText.includes("editor-action"));
  assert.equal(nested.length, 2);
  assert.ok(nested.every((site) => site.expectedMultiplicity === 4 && site.renderCollections.length === 2));
});

test("traversal de-duplicates stable controls but exercises every per-step choice and endpoint", async () => {
  const target = (key: string, name = key) => ({
    expectedMultiplicity: 1,
    key,
    multiplicityIsExact: true,
    name,
    sourceExpression: name
  });
  const choiceSite = {
    endpointExpressions: ["activate"],
    endpointTargets: [target("activate")],
    expectedMultiplicity: 3,
    lessonChoiceMultiplicity: [3, 2],
    multiplicityIsExact: true,
    numericMidpoint: null,
    renderCollection: "current.choices",
    renderCollections: ["current.choices"],
    sourceConditionKeys: [],
    customComponentNamespace: null,
    imperativeBinding: null,
    interactionSourceHandlers: null,
    kind: "action-button",
    siteKey: "action-button:0:choices",
    sourceOrdinal: 0,
    sourceText: "<button>{choice}</button>"
  } as const;
  const modeSite = {
    endpointExpressions: ["activate", "restore"],
    endpointTargets: [target("activate"), target("restore")],
    expectedMultiplicity: 3,
    lessonChoiceMultiplicity: null,
    multiplicityIsExact: true,
    numericMidpoint: null,
    renderCollection: "MODES",
    renderCollections: ["MODES"],
    sourceConditionKeys: [],
    customComponentNamespace: null,
    imperativeBinding: null,
    interactionSourceHandlers: null,
    kind: "press-button",
    siteKey: "press-button:1:modes",
    sourceOrdinal: 1,
    sourceText: "<button aria-pressed={active}>{mode}</button>"
  } as const;
  const rangeSite = {
    endpointExpressions: ["min:0", "mid:canonical-midpoint(min=0;max=10;step=default:1)", "max:10"],
    endpointTargets: [target("min"), target("mid"), target("max")],
    expectedMultiplicity: 1,
    lessonChoiceMultiplicity: null,
    multiplicityIsExact: true,
    numericMidpoint: {
      reason: null,
      sourceExpression: "canonical-midpoint(min=0;max=10;step=default:1)",
      status: "required"
    },
    renderCollection: null,
    renderCollections: [],
    sourceConditionKeys: [],
    customComponentNamespace: null,
    imperativeBinding: null,
    interactionSourceHandlers: null,
    kind: "range",
    siteKey: "range:2:value",
    sourceOrdinal: 2,
    sourceText: "<input type=\"range\" min={0} max={10} />"
  } as const;
  const bench: CaliforniaSignatureBenchControlBlueprint = {
    benchId: "AddLab",
    controlSites: [choiceSite, modeSite, rangeSite],
    lessonSteps: [
      { choiceCount: 3, index: 0, key: "lesson-step:0", title: "First" },
      { choiceCount: 2, index: 1, key: "lesson-step:1", title: "Second" }
    ],
    unresolvedInteractions: [],
    sourcePath: "synthetic/AddLab.jsx",
    sourceSha256: "0".repeat(64)
  };
  const endpoint = (sourceTargetKey: string, value = sourceTargetKey): CaliforniaSignatureRuntimeEndpoint => ({
    instanceKey: "direct",
    sourceTargetKey,
    value
  });
  const controls = (step: number): CaliforniaSignatureTraversalControl[] => [
    ...Array.from({ length: step === 0 ? 3 : 2 }, (_, index) => ({
      endpoints: [endpoint("activate")],
      instanceKey: `choice-${index}`,
      kind: "action-button" as const,
      sourceSiteKey: choiceSite.siteKey,
      sourceConditionKeys: []
    })),
    ...["algebra", "geometry", "statistics"].map((mode) => ({
      endpoints: [endpoint("activate"), endpoint("restore")],
      instanceKey: mode,
      kind: "press-button" as const,
      sourceSiteKey: modeSite.siteKey,
      sourceConditionKeys: []
    })),
    {
      endpoints: [endpoint("min", "0"), endpoint("mid", "5"), endpoint("max", "10")],
      instanceKey: "value",
      kind: "range",
      sourceSiteKey: rangeSite.siteKey,
      sourceConditionKeys: []
    }
  ];
  let gateCount = 0;
  let endpointCount = 0;
  let restoreCount = 0;
  const evidence = await traverseCaliforniaSignatureBenchControls(bench, {
    activateEndpoint: async () => { endpointCount += 1; },
    controlsForStep: async (_bench, step) => controls(step.index),
    restoreDefault: async () => { restoreCount += 1; },
    runGates: async () => { gateCount += 1; },
    unlockLessonStep: async () => {}
  });

  assert.equal(evidence.coveredKeys.length, 25);
  assert.equal(endpointCount, 14, "five choices + three reversible modes + three numeric endpoints");
  assert.equal(restoreCount, endpointCount);
  assert.equal(gateCount, 2 + endpointCount, "each lesson state and endpoint state must be gated");
  assert.equal(evidence.sourceSitePeakMultiplicity.get(choiceSite.siteKey), 3);
  assert.equal(evidence.sourceSitePeakMultiplicity.get(modeSite.siteKey), 3);
});

test("runtime endpoints stay below their source ceiling and cannot rename or exceed it", async () => {
  const site = {
    customComponentNamespace: null,
    imperativeBinding: null,
    interactionSourceHandlers: null,
    endpointExpressions: ["option:o.v"],
    endpointTargets: [{
      expectedMultiplicity: 3,
      key: "option:0:source",
      multiplicityIsExact: true,
      name: "option",
      sourceExpression: "o.v"
    }],
    expectedMultiplicity: 1,
    kind: "select",
    lessonChoiceMultiplicity: null,
    multiplicityIsExact: true,
    numericMidpoint: null,
    renderCollection: null,
    renderCollections: [],
    siteKey: "select:0:source",
    sourceConditionKeys: ["mode === 'reviewed'"],
    sourceOrdinal: 0,
    sourceText: "<select>{OPTIONS.map(o => <option value={o.v} />)}</select>"
  } as const;
  const bench: CaliforniaSignatureBenchControlBlueprint = {
    benchId: "AddLab",
    controlSites: [site],
    lessonSteps: [{ choiceCount: 0, index: 0, key: "lesson-step:0", title: "Only" }],
    sourcePath: "synthetic/Select.jsx",
    sourceSha256: "0".repeat(64),
    unresolvedInteractions: []
  };
  const run = (
    endpoints: CaliforniaSignatureRuntimeEndpoint[],
    sourceConditionKeys: readonly string[] = site.sourceConditionKeys
  ) =>
    traverseCaliforniaSignatureBenchControls(bench, {
      activateEndpoint: async () => {},
      controlsForStep: async () => [{
        endpoints,
        instanceKey: "direct",
        kind: "select",
        sourceConditionKeys,
        sourceSiteKey: site.siteKey
      }],
      restoreDefault: async () => {},
      runGates: async () => {},
      unlockLessonStep: async () => {}
    });
  await assert.doesNotReject(
    () => run([
      { instanceKey: "a", sourceTargetKey: site.endpointTargets[0].key, value: "a" },
      { instanceKey: "c", sourceTargetKey: site.endpointTargets[0].key, value: "c" }
    ])
  );
  await assert.rejects(
    () => run([
      { instanceKey: "a", sourceTargetKey: site.endpointTargets[0].key, value: "a" },
      { instanceKey: "b", sourceTargetKey: site.endpointTargets[0].key, value: "b" },
      { instanceKey: "c", sourceTargetKey: site.endpointTargets[0].key, value: "c" },
      { instanceKey: "d", sourceTargetKey: site.endpointTargets[0].key, value: "d" }
    ]),
    /runtime endpoints 4\/3 ceiling/
  );
  await assert.rejects(
    () => run([
      { instanceKey: "a", sourceTargetKey: "DOM-invented", value: "a" },
      { instanceKey: "b", sourceTargetKey: "DOM-invented", value: "b" },
      { instanceKey: "c", sourceTargetKey: "DOM-invented", value: "c" }
    ]),
    /unknown source target/
  );
  await assert.rejects(
    () => run([
      { instanceKey: "a", sourceTargetKey: site.endpointTargets[0].key, value: "a" },
      { instanceKey: "b", sourceTargetKey: site.endpointTargets[0].key, value: "b" },
      { instanceKey: "c", sourceTargetKey: site.endpointTargets[0].key, value: "c" }
    ], []),
    /source conditions is not exact/
  );
});

const reviewedSyntheticKeys = [
  "Bench:lesson-step:0:state",
  "Bench:lesson-step:0:mode:algebra",
  "Bench:lesson-step:0:mode:geometry",
  "Bench:lesson-step:0:mode:statistics",
  "Bench:lesson-step:0:control:first",
  "Bench:lesson-step:0:control:middle",
  "Bench:lesson-step:0:control:last",
  "Bench:lesson-step:0:control:middle:endpoint:min",
  "Bench:lesson-step:0:control:middle:endpoint:max"
];

test("coverage is fail-closed when a non-last mode is missing", () => {
  assert.throws(
    () => assertExactCaliforniaSignatureCoverage(
      reviewedSyntheticKeys,
      reviewedSyntheticKeys.filter((key) => key !== "Bench:lesson-step:0:mode:geometry"),
      "missing-mode-canary"
    ),
    /missing-mode-canary is not exact.*mode:geometry/
  );
});

test("coverage is fail-closed when a non-first control is missing", () => {
  assert.throws(
    () => assertExactCaliforniaSignatureCoverage(
      reviewedSyntheticKeys,
      reviewedSyntheticKeys.filter((key) => key !== "Bench:lesson-step:0:control:middle"),
      "missing-control-canary"
    ),
    /missing-control-canary is not exact.*control:middle/
  );
});

test("coverage is fail-closed when one endpoint is missing", () => {
  assert.throws(
    () => assertExactCaliforniaSignatureCoverage(
      reviewedSyntheticKeys,
      reviewedSyntheticKeys.filter((key) => !key.endsWith("endpoint:max")),
      "missing-endpoint-canary"
    ),
    /missing-endpoint-canary is not exact.*endpoint:max/
  );
});

test("a compact reviewed runtime snapshot rejects exact-key drift and duplicates", () => {
  const reviewed = snapshotCaliforniaSignatureRuntimeCoverage(reviewedSyntheticKeys);
  assert.equal(reviewed.keyCount, reviewedSyntheticKeys.length);
  assert.doesNotThrow(() =>
    assertReviewedCaliforniaSignatureRuntimeSnapshot(reviewed, reviewedSyntheticKeys)
  );
  assert.throws(
    () => assertReviewedCaliforniaSignatureRuntimeSnapshot(
      reviewed,
      reviewedSyntheticKeys.filter((key) => key !== "Bench:lesson-step:0:control:middle")
    ),
    /reviewed runtime snapshot drifted/
  );
  assert.throws(
    () => snapshotCaliforniaSignatureRuntimeCoverage([
      ...reviewedSyntheticKeys,
      reviewedSyntheticKeys[0]!
    ]),
    /refuses duplicate coverage keys/
  );
});
