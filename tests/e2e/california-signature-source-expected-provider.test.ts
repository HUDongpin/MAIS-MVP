import assert from "node:assert/strict";
import test from "node:test";
import { chromium } from "@playwright/test";
import {
  buildCaliforniaSignatureSourceManifest,
  CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION,
  type CaliforniaSignatureSourceManifest
} from "./california-signature-control-manifest";
import {
  assertCaliforniaSignatureSourceExpectedEvidenceOracleExact,
  auditCaliforniaSignatureSourceExpectedManifest,
  buildCaliforniaSignatureSourceExpectedEvidenceOracle,
  buildCaliforniaSignatureSourcePairwiseCombinations,
  CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY,
  CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_CONTROL_KINDS,
  CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION,
  californiaSignatureSourceExpectedProvider,
  createCaliforniaSignatureSourceExpectedProvider,
  inspectCaliforniaSignatureSourceExpectedControls,
  iterateCaliforniaSignatureSourceEvidenceOracleRows,
  type CaliforniaSignatureSourceExpectedEvidenceOracle
} from "./california-signature-source-expected-provider";
import {
  CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE,
  CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE
} from "./california-signature-qa-instrumentation";

const manifest = buildCaliforniaSignatureSourceManifest();
const evidenceOracle = (() => {
  let promise: ReturnType<typeof buildCaliforniaSignatureSourceExpectedEvidenceOracle> | null = null;
  return () => promise ??= buildCaliforniaSignatureSourceExpectedEvidenceOracle(manifest);
})();
const rowsCache = new WeakMap<CaliforniaSignatureSourceExpectedEvidenceOracle, ReturnType<
  typeof iterateCaliforniaSignatureSourceEvidenceOracleRows
> extends Generator<infer T> ? T[] : never>();
function evidenceRows(oracle: CaliforniaSignatureSourceExpectedEvidenceOracle) {
  const cached = rowsCache.get(oracle);
  if (cached) return cached;
  const rows = [...iterateCaliforniaSignatureSourceEvidenceOracleRows({ manifest, oracle })];
  rowsCache.set(oracle, rows);
  return rows;
}

function bench(benchId: string) {
  const match = manifest.benches.find((candidate) => candidate.benchId === benchId);
  assert.ok(match, `${benchId}: missing reviewed bench`);
  return match;
}

test("source oracle enumerates exact non-first, custom-namespace, and dynamic option identities", async () => {
  const comparing = bench("ComparingLab");
  const comparingControls = await inspectCaliforniaSignatureSourceExpectedControls({
    bench: comparing,
    branchPath: [],
    stepKey: comparing.lessonSteps[0].key
  });
  const dials = comparing.controlSites.find((site) =>
    site.customComponentNamespace?.componentName === "DigitDials"
  )!;
  const dialInstances = comparingControls
    .filter((control) => control.sourceSiteKey === dials.siteKey)
    .map((control) => control.instanceKey)
    .sort();
  assert.equal(dialInstances.length, 6);
  assert.ok(dialInstances.some((identity) => identity.includes('"a"')));
  assert.ok(dialInstances.some((identity) => identity.includes('"b"')));

  const boxPlot = bench("BoxPlotLab");
  const boxPlotControls = await inspectCaliforniaSignatureSourceExpectedControls({
    bench: boxPlot,
    branchPath: [],
    stepKey: boxPlot.lessonSteps[0].key
  });
  const selectSite = boxPlot.controlSites.find((site) => site.kind === "select")!;
  const select = boxPlotControls.find((control) => control.sourceSiteKey === selectSite.siteKey)!;
  assert.ok(select.endpoints.length >= 3, "dynamic option maps must include their middle endpoint");
  assert.equal(select.endpoints.length, select.sourceEndpoints.length);
  assert.equal(new Set(select.sourceEndpoints.map((endpoint) => endpoint.instanceKey)).size,
    select.sourceEndpoints.length);
});

test("source oracle binds every required numeric midpoint and the exact audited binary exception", async () => {
  const oracle = await evidenceOracle();
  const rows = evidenceRows(oracle);
  const numericControls = oracle.states.flatMap((state) => state.controls.filter((control) =>
    control.kind === "range" || control.kind === "number"
  ));
  assert.ok(numericControls.length > 0, "source oracle has no numeric controls");
  const unavailableSites = new Set<string>();
  for (const control of numericControls) {
    assert.ok(control.numericMidpoint, "numeric oracle control lost its source midpoint audit");
    if (control.numericMidpoint.status === "unavailable") {
      unavailableSites.add(`${control.benchId}/${control.sourceSiteKey}`);
      assert.deepEqual(
        control.allEndpoints.map((endpoint) => endpoint.activationEndpoint),
        control.numericMidpoint.reachableCardinality === 1 ? ["min"] : ["min", "max"]
      );
      assert.match(control.numericMidpoint.reason ?? "",
        /no distinct step-valid interior value|only one distinct reachable value/);
      continue;
    }
    assert.deepEqual(control.allEndpoints.map((endpoint) => endpoint.activationEndpoint), ["min", "mid", "max"]);
    const midpoint = control.allEndpoints[1];
    assert.ok(midpoint?.sourceEndpoint.value, "numeric midpoint must retain an exact activation value");
    const minimum = Number(control.allEndpoints[0]?.sourceEndpoint.value);
    const interior = Number(midpoint.sourceEndpoint.value);
    const maximum = Number(control.allEndpoints[2]?.sourceEndpoint.value);
    assert.ok(minimum < interior && interior < maximum, "numeric midpoint duplicated an endpoint");
    assert.ok(rows.some((row) =>
      row.rowKind === "endpoint" && row.benchId === control.benchId &&
      row.sourceSiteKey === control.sourceSiteKey &&
      row.instanceKey === control.instanceKey && row.activationEndpoint === "mid" &&
      row.sourceEndpoint?.sourceTargetKey === midpoint.sourceEndpoint.sourceTargetKey
    ), `${control.benchId}/${control.stepKey}: midpoint is absent from exact evidence rows`);
  }
  assert.ok(unavailableSites.has("ConditionalLab/range:0:cf5c39cf0dafffca"));
  assert.ok(unavailableSites.has("DilationsLab/range:1:fa11a0698efd58b0"));
  assert.ok(unavailableSites.has("FractionMultiplicationLab/range:1:32e2aafcadce1955"));
});

test("source oracle emits the complete canonical pairwise endpoint product for every exact state", async () => {
  const oracle = await evidenceOracle();
  const combinationRows = evidenceRows(oracle).filter((row) => row.rowKind === "combination");
  let expectedCombinationRows = 0;

  for (const state of oracle.states) {
    const candidate = bench(state.benchId);
    const navigation = await californiaSignatureSourceExpectedProvider.navigationContract(candidate);
    const controls = state.controls.filter((control) =>
      !control.disabled && control.activeEndpoints.length > 0 &&
      ![navigation.answerSiteKey, navigation.backSiteKey, navigation.nextSiteKey].includes(control.sourceSiteKey)
    ).sort((left, right) => left.key.localeCompare(right.key));
    let stateCombinationRows = 0;
    for (let left = 0; left < controls.length; left += 1) {
      for (let right = left + 1; right < controls.length; right += 1) {
        stateCombinationRows +=
          controls[left]!.activeEndpoints.length * controls[right]!.activeEndpoints.length;
      }
    }
    expectedCombinationRows += stateCombinationRows;

    const stateRows = combinationRows.filter((row) =>
      row.benchId === state.benchId && row.stepKey === state.stepKey &&
      JSON.stringify(row.branchPath) === JSON.stringify(state.branchPath)
    );
    assert.equal(
      stateRows.length,
      stateCombinationRows,
      `${state.benchId}/${state.stepKey}: pairwise source product was sampled or truncated`
    );
    for (const row of stateRows) {
      const activations = row.combinationActivations;
      assert.ok(activations, "combination row lost its activation tuple");
      assert.equal(activations.length, 2, "a pairwise row must contain exactly two activations");
      const controlIdentities = activations.map((activation) =>
        `${activation.sourceSiteKey}\0${activation.instanceKey}`
      );
      assert.equal(new Set(controlIdentities).size, 2, "pairwise activations must target distinct controls");
      assert.deepEqual(controlIdentities, [...controlIdentities].sort(),
        "unordered pair identity must use one canonical control order");
      assert.ok(activations.every((activation) =>
        activation.activationEndpoint && activation.sourceEndpoint.instanceKey &&
        activation.sourceEndpoint.sourceTargetKey && activation.sourceEndpoint.value
      ), "combination activation lost its exact source endpoint identity");
    }
  }

  assert.ok(expectedCombinationRows > 0, "source-derived pairwise matrix is unexpectedly empty");
  assert.equal(combinationRows.length, expectedCombinationRows,
    "source oracle did not emit the exact all-state pairwise endpoint matrix");
});

test("pairwise source coverage fails closed instead of truncating an exact state", async () => {
  const oracle = await evidenceOracle();
  const state = oracle.states.find((candidate) => candidate.controls.filter(
    (control) => !control.disabled && control.activeEndpoints.length > 0
  ).length >= 2);
  assert.ok(state, "source oracle has no state with two active controls");
  const candidate = bench(state.benchId);
  const navigation = await californiaSignatureSourceExpectedProvider.navigationContract(candidate);
  const exact = buildCaliforniaSignatureSourcePairwiseCombinations(state, navigation);
  assert.ok(exact.length > 0, "selected source state unexpectedly has no non-navigation pair");
  assert.throws(
    () => buildCaliforniaSignatureSourcePairwiseCombinations(state, navigation, exact.length - 1),
    new RegExp(`${state.benchId}.*exact pairwise endpoint product ${exact.length}.*fail-closed per-state cap`)
  );
});

test("source evidence oracle independently closes every control kind, middle option, and Canvas receipt row", async () => {
  const oracle = await evidenceOracle();
  assert.equal(oracle.schemaVersion, CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_SCHEMA_VERSION);
  assert.equal(oracle.schemaVersion, 3);
  assert.equal(oracle.blueprintSha256, manifest.blueprintSha256);
  assert.equal(oracle.componentSourceSha256, manifest.componentSourceSha256);
  assert.equal(oracle.frontierRemaining, 0);
  assert.deepEqual(oracle.counts, {
    authoredStates: 1_255,
    branchStates: 46,
    canvasReceiptRows: 85_918,
    combinationOccurrences: 77_722,
    controlOccurrences: 14_612,
    endpointOccurrences: 16_994,
    evidenceCombinationRows: 77_722,
    evidenceControlRows: 5_671,
    evidenceEndpointRows: 6_941,
    evidenceRows: 91_589,
    evidenceStateRows: 1_255,
    numericAvailableOccurrences: 2_419,
    numericOccurrences: 2_435,
    numericUnavailableContracts: 8,
    numericUnavailableOccurrences: 16,
    numericUnavailableSites: 5,
    reachableStates: 1_301
  });
  assert.equal(oracle.canvasContractSha256,
    "a1610353a2508e3e87ac377c080e975858575c1a9a251e012cb2d14b6a5eb371");
  assert.equal(oracle.evidenceKeysSha256,
    "3f09fcae412ba6c29704b41467e39622721d3902175553005a4123bf127088f1");
  assert.deepEqual(oracle.pairwisePeak, {
    rowCount: 760,
    stateKey: '{"benchId":"IrrationalLab","branchPath":[],"stepKey":"lesson-step:2"}'
  });

  const kinds = [...new Set(oracle.states.flatMap((state) =>
    state.controls.map((control) => control.kind)
  ))].sort();
  assert.deepEqual([...CALIFORNIA_SIGNATURE_SOURCE_EVIDENCE_ORACLE_CONTROL_KINDS], [
    "action-button",
    "checkbox",
    "interaction-surface",
    "number",
    "press-button",
    "radio",
    "range",
    "select",
    "textarea"
  ]);
  assert.deepEqual(kinds, [
    "action-button",
    "interaction-surface",
    "number",
    "press-button",
    "range",
    "select"
  ], "current frozen component SHA has six authored kinds; all nine remain explicitly supported");
  for (const kind of kinds) {
    assert.ok(oracle.states.some((state) => state.controls.some((control) =>
      control.kind === kind && control.activeEndpoints.length > 0
    )), `${kind}: oracle has no active source endpoint`);
  }

  const boxPlotSelect = oracle.states
    .filter((state) => state.benchId === "BoxPlotLab")
    .flatMap((state) => state.controls)
    .find((control) => control.kind === "select" && control.allEndpoints.length >= 3);
  assert.ok(boxPlotSelect, "BoxPlotLab: expected a source select with a middle option");
  const middle = boxPlotSelect.allEndpoints[Math.floor(boxPlotSelect.allEndpoints.length / 2)];
  assert.ok(middle?.activationEndpoint.startsWith("option:"));
  assert.ok(middle?.sourceEndpoint.instanceKey);
  const rows = evidenceRows(oracle);
  assert.ok(rows.some((row) =>
    row.rowKind === "endpoint" && row.benchId === "BoxPlotLab" &&
    row.sourceSiteKey === boxPlotSelect.sourceSiteKey &&
    row.activationEndpoint === middle.activationEndpoint &&
    row.sourceEndpoint?.instanceKey === middle.sourceEndpoint.instanceKey
  ), "middle select option must survive into the independent expected evidence rows");

  for (const row of rows) {
    assert.equal(row.key.length > 0, true);
    if (row.rowKind === "authored-state") {
      assert.deepEqual(row.phases, ["functional", "layout", "structural"]);
      assert.deepEqual(row.canvasSurface?.requiredPhases ?? [], ["structural"]);
    } else if (row.rowKind === "control") {
      assert.deepEqual(row.phases, ["functional", "layout"]);
      assert.deepEqual(row.canvasSurface?.requiredPhases ?? [], []);
    } else if (row.rowKind === "combination") {
      assert.deepEqual(row.phases, ["layout"]);
      assert.deepEqual(row.canvasSurface?.requiredPhases ?? [], ["layout"]);
      assert.equal(row.activationEndpoint, null);
      assert.equal(row.sourceEndpoint, null);
      assert.equal(row.combinationActivations?.length, 2);
    } else {
      assert.deepEqual(row.phases, ["functional", "layout"]);
      assert.deepEqual(row.canvasSurface?.requiredPhases ?? [], ["layout"]);
      assert.ok(row.activationEndpoint);
      assert.ok(row.sourceEndpoint?.sourceTargetKey);
    }
  }
  assert.deepEqual(
    assertCaliforniaSignatureSourceExpectedEvidenceOracleExact(
      manifest,
      oracle,
      rows.map((row) => row.key)
    ),
    { evidenceKeysSha256: oracle.evidenceKeysSha256, evidenceRows: rows.length }
  );
});

test("source evidence oracle rejects missing, duplicate, extra, and duplicate-expected rows", async () => {
  const oracle = await evidenceOracle();
  const exact = evidenceRows(oracle).map((row) => row.key);
  assert.throws(
    () => assertCaliforniaSignatureSourceExpectedEvidenceOracleExact(manifest, oracle, exact.slice(1)),
    /missing=1 extra=0/i
  );
  assert.throws(
    () => assertCaliforniaSignatureSourceExpectedEvidenceOracleExact(manifest, oracle, [...exact, exact[0]!]),
    /actual evidence contains duplicate keys/i
  );
  assert.throws(
    () => assertCaliforniaSignatureSourceExpectedEvidenceOracleExact(manifest, oracle, [...exact, "invented-row"]),
    /missing=0 extra=1/i
  );
  assert.throws(
    () => assertCaliforniaSignatureSourceExpectedEvidenceOracleExact(manifest, {
      ...oracle,
      evidenceKeysSha256: "0".repeat(64)
    }, exact),
    /digest drift/i
  );
});

test("semantic registry is exact per source site and endpoint, never a family blanket", () => {
  const sourceInteractions = manifest.benches.flatMap((candidate) =>
    candidate.controlSites.filter((site) => site.kind === "interaction-surface").map((site) => ({
      benchId: candidate.benchId,
      interaction: {
        handlerRef: site.endpointTargets.map((target) =>
          `${target.name}=${target.sourceExpression}`
        ).join(";"),
        siteKey: site.siteKey
      }
    }))
  );
  assert.equal(sourceInteractions.length, 56);
  assert.equal(CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.length, 56);
  const registryKeys = CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.map((entry) =>
    `${entry.benchId}\0${entry.siteKey}`
  );
  assert.equal(new Set(registryKeys).size, registryKeys.length);
  for (const { benchId, interaction } of sourceInteractions) {
    const entry = CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.find((candidate) =>
      candidate.benchId === benchId && candidate.siteKey === interaction.siteKey
    );
    assert.ok(entry, `${benchId}/${interaction.siteKey}: missing reviewed semantic action`);
    assert.equal(entry.sourceHandlerRef, interaction.handlerRef);
    assert.deepEqual(
      [...entry.endpointActions.map((action) => action.sourceEventTargetKey)].sort(),
      [...new Set(entry.endpointActions.map((action) => action.sourceEventTargetKey))].sort(),
      `${benchId}/${interaction.siteKey}: endpoint action keys must be unique`
    );
    assert.ok(entry.endpointActions.every((action) => action.steps.length > 0));
    for (const action of entry.endpointActions) {
      for (const step of action.steps) {
        if (step.type === "pointer") {
          assert.ok(step.x >= 0 && step.x <= 1 && step.y >= 0 && step.y <= 1,
            `${benchId}/${interaction.siteKey}: pointer action is not normalized`);
        } else {
          assert.match(step.key, /^(?:[1-9]|Arrow(?:Left|Right|Up|Down)|Enter| )$/);
        }
      }
    }
  }
});

test("assertReady rejects source, site, handler, endpoint, and multiplicity drift", async () => {
  await assert.rejects(
    () => californiaSignatureSourceExpectedProvider.assertReady({
      ...manifest,
      schemaVersion: 2
    }),
    /schema v2 is rejected.*expected v4/i
  );
  assert.equal(CALIFORNIA_SIGNATURE_SOURCE_SCHEMA_VERSION, 4);

  await assert.rejects(
    () => californiaSignatureSourceExpectedProvider.assertReady({
      ...manifest,
      componentSourceSha256: "0".repeat(64)
    }),
    /source identity drift/i
  );

  const first = CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY[0];
  const missingRegistryProvider = createCaliforniaSignatureSourceExpectedProvider({
    interactionRegistry: CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.slice(1)
  });
  await assert.rejects(() => missingRegistryProvider.assertReady(manifest),
    new RegExp(`${first.benchId}.*${first.siteKey.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i"));

  const driftedHandlerProvider = createCaliforniaSignatureSourceExpectedProvider({
    interactionRegistry: CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.map((entry, index) =>
      index === 0 ? { ...entry, sourceHandlerRef: `${entry.sourceHandlerRef}-drift` } : entry
    )
  });
  await assert.rejects(() => driftedHandlerProvider.assertReady(manifest), /handler.*drift/i);

  const targetBench = manifest.benches[0]!;
  const targetSite = targetBench.controlSites[0]!;
  const ambiguous: CaliforniaSignatureSourceManifest = {
    ...manifest,
    benches: manifest.benches.map((candidate) => candidate.benchId === targetBench.benchId
      ? { ...candidate, controlSites: candidate.controlSites.map((site) =>
          site.siteKey === targetSite.siteKey ? { ...site, multiplicityIsExact: false } : site) }
      : candidate)
  };
  await assert.rejects(() => californiaSignatureSourceExpectedProvider.assertReady(ambiguous),
    /multiplicity|source cardinality/i);
});

test("all authored states and target-directed source branches close with an empty frontier", async () => {
  const sweep = await auditCaliforniaSignatureSourceExpectedManifest(manifest);
  assert.deepEqual(sweep, {
    activeSemanticEndpoints: 67,
    authoredControls: 13_802,
    authoredEndpoints: 20_668,
    authoredStates: 1_255,
    branchCoverageProofs: [
      "semantic:LinePlotLab\0interaction-surface:0:02fad253fca46da4\0pointer-pick",
      "semantic:RatioLab\0interaction-surface:0:4238288c9117d00b\0drag",
      "site:FractionLinePlotLab\0action-button:5:c545601826946991",
      "site:ModeLab\0action-button:10:4828bfeeea76eb6c",
      "site:PrimeFactorizationLab\0action-button:1:632e1669bf203ee4"
    ],
    branchControls: 810,
    branchEndpoints: 1_306,
    branchFrontierExpected: 46,
    branchFrontierRemaining: 0,
    branchFrontierVisited: 46,
    branchStates: 46,
    inactiveZeroEndpointControls: [
      "MedianLab\0lesson-step:6\0select:1:0650af3dfddcce43\0direct",
      "StandardDeviationLab\0lesson-step:6\0select:1:0650af3dfddcce43\0direct"
    ],
    reachableControlSites: 1_854,
    semanticEndpoints: 67
  });
});

test("source-disabled zero-option controls remain inactive even if a runtime clone claims enabled", async () => {
  for (const [benchId, siteKey] of [
    ["MedianLab", "select:1:0650af3dfddcce43"],
    ["StandardDeviationLab", "select:1:0650af3dfddcce43"]
  ] as const) {
    const candidate = bench(benchId);
    const context = {
      bench: candidate,
      branchPath: [],
      stepKey: "lesson-step:6"
    };
    const source = (await inspectCaliforniaSignatureSourceExpectedControls(context)).find((control) =>
      control.sourceSiteKey === siteKey
    );
    assert.ok(source, `${benchId}/${siteKey}: missing disabled source control`);
    assert.deepEqual(source.endpoints, []);
    assert.deepEqual(
      await californiaSignatureSourceExpectedProvider.activeEndpoints({
        context,
        control: {
          ...source,
          checked: null,
          disabled: false,
          endpoints: [...source.endpoints],
          max: null,
          maxLength: -1,
          min: null,
          minLength: -1,
          name: "runtime-claims-enabled",
          optionValues: [],
          pressed: null,
          tagName: "select",
          step: null,
          type: "select",
          value: "",
          visible: true
        }
      }),
      []
    );
  }
});

test("activeEndpoints fails closed when a runtime request cites a missing source control", async () => {
  const candidate = bench("ComparingLab");
  const context = {
    bench: candidate,
    branchPath: [],
    stepKey: candidate.lessonSteps[0].key
  };
  const source = (await inspectCaliforniaSignatureSourceExpectedControls(context))[0];
  assert.ok(source);
  await assert.rejects(
    () => californiaSignatureSourceExpectedProvider.activeEndpoints({
      context,
      control: {
        ...source,
        checked: null,
        disabled: false,
        endpoints: [...source.endpoints],
        instanceKey: `${source.instanceKey}-missing`,
        max: null,
        maxLength: -1,
        min: null,
        minLength: -1,
        name: "missing-source-control",
        optionValues: [],
        pressed: null,
        tagName: "button",
        step: null,
        type: "button",
        value: "",
        visible: true
      }
    }),
    /requested source control is missing.*ComparingLab|ComparingLab.*requested source control is missing/i
  );
});

test("all 186 navigation contracts are source-derived and use distinct exact sites", async () => {
  for (const candidate of manifest.benches) {
    const contract = await californiaSignatureSourceExpectedProvider.navigationContract(candidate);
    const sites = new Set(candidate.controlSites.map((site) => site.siteKey));
    assert.ok(sites.has(contract.answerSiteKey), `${candidate.benchId}: missing answer site`);
    assert.ok(sites.has(contract.backSiteKey), `${candidate.benchId}: missing back site`);
    assert.ok(sites.has(contract.nextSiteKey), `${candidate.benchId}: missing next site`);
    assert.equal(new Set(Object.values(contract)).size, 3, `${candidate.benchId}: navigation aliases a site`);
  }
});

test("normalized interaction executor dispatches the frozen sequence in Chromium", async () => {
  const area = bench("AreaLab");
  const site = area.controlSites.find((candidate) => candidate.kind === "interaction-surface")!;
  const entry = CALIFORNIA_SIGNATURE_SEMANTIC_INTERACTION_REGISTRY.find((candidate) =>
    candidate.benchId === area.benchId && candidate.siteKey === site.siteKey
  )!;
  const action = entry.endpointActions[0];
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    await page.setContent(
      `<div id="root"><div id="target" ` +
      `${CALIFORNIA_SIGNATURE_QA_SITE_ATTRIBUTE}="${site.siteKey}" ` +
      `${CALIFORNIA_SIGNATURE_QA_INSTANCE_ATTRIBUTE}="direct" ` +
      `style="width:400px;height:300px"></div></div>`
    );
    await page.locator("#target").evaluate((target) => {
      const log: Array<{ type: string; x: number; y: number; key?: string }> = [];
      for (const type of [
        "pointerdown", "pointermove", "pointerup", "pointercancel", "pointerleave",
        "click", "contextmenu", "keydown"
      ]) {
        target.addEventListener(type, (event) => {
          const pointer = event as PointerEvent;
          const keyboard = event as KeyboardEvent;
          log.push({ type, x: pointer.clientX ?? -1, y: pointer.clientY ?? -1, key: keyboard.key });
        });
      }
      (window as typeof window & { __sourceActionLog?: typeof log }).__sourceActionLog = log;
    });
    await californiaSignatureSourceExpectedProvider.activateNonFormEndpoint({
      context: { bench: area, branchPath: [], stepKey: area.lessonSteps[0].key },
      control: {
        checked: null,
        disabled: false,
        endpoints: [action.activationEndpoint],
        instanceKey: "direct",
        kind: "interaction-surface",
        max: null,
        maxLength: -1,
        min: null,
        minLength: -1,
        name: "",
        numericMidpoint: null,
        optionValues: [],
        pressed: null,
        sourceConditionKeys: site.sourceConditionKeys,
        sourceEndpoints: [{
          instanceKey: "direct",
          sourceTargetKey: action.sourceEventTargetKey,
          value: action.activationEndpoint
        }],
        sourceSiteKey: site.siteKey,
        tagName: "div",
        step: null,
        type: "div",
        value: "",
        visible: true
      },
      endpoint: action.activationEndpoint,
      root: page.locator("#root")
    });
    const log = await page.evaluate(() =>
      (window as typeof window & { __sourceActionLog?: unknown[] }).__sourceActionLog ?? []
    );
    assert.deepEqual((log as Array<{ type: string }>).map((event) => event.type),
      action.steps.map((step) => step.type === "key" ? "keydown" : step.event));
  } finally {
    await browser.close();
  }
});
